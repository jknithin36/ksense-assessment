require("dotenv").config();

const API = "https://assessment.ksensetech.com/api";
const SECRET_KEY =
  process.env.SECRET_KEY ||
  "ak_430609c2de72f7dfdd771a88f09a0dba560c4b43eb7fb04e";

// utils
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => ms + Math.floor(Math.random() * 250);

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const requestJson = async (
  method: "GET" | "POST",
  url: string,
  body?: any,
  attempt = 1
): Promise<any> => {
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": SECRET_KEY,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
  });

  if (res.status === 429) {
    const parsed = await safeJson(res);
    const retryAfterSeconds = Number(parsed?.retry_after ?? 5);

    if (attempt >= 12) {
      const text = await res.text().catch(() => "");
      throw new Error(`Too many 429 retries: ${text}`);
    }

    const waitMs = jitter(retryAfterSeconds * 1000);
    console.log(
      `Rate Limit Error - Wait for ${Math.ceil(
        waitMs / 1000
      )}s - Then Retry Again - Thank You`
    );

    await sleep(waitMs);
    return requestJson(method, url, body, attempt + 1);
  }

  if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
    if (attempt >= 12) {
      const text = await res.text().catch(() => "");
      throw new Error(`Server Error ${res.status} after retries: ${text}`);
    }

    const backoffMs = jitter(500 * Math.pow(2, attempt - 1));
    console.log(
      `${res.status} server glitch: wait for ${backoffMs}ms then retry ${
        attempt + 1
      } (url=${url}) Thank You`
    );

    await sleep(backoffMs);
    return requestJson(method, url, body, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} Failed ${res.status}: ${text}`);
  }

  return res.json();
};

const getPatients = async (page: number, limit: number) => {
  const url = `${API}/patients?page=${page}&limit=${limit}`;
  return requestJson("GET", url);
};

const getAllpatients = async () => {
  let page = 1;
  const limit = 20;

  const allPatients: any[] = [];
  const seen = new Set<string>();

  const MAX_PAGES = 60;

  while (page <= MAX_PAGES) {
    const response = await getPatients(page, limit);

    const dataRaw = response?.data;
    const data = Array.isArray(dataRaw) ? dataRaw : [];

    for (const p of data) {
      const id = String(p?.patient_id ?? "").trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        allPatients.push(p);
      }
    }

    const pag = response?.pagination ?? null;

    const hasNext =
      typeof pag?.hasNext === "boolean" ? pag.hasNext : undefined;

    const totalPages =
      Number.isFinite(Number(pag?.totalPages)) ? Number(pag.totalPages) : undefined;

    // stop rules (handles inconsistent pagination)
    if (data.length === 0) break;
    if (hasNext === false) break;
    if (typeof totalPages === "number" && page >= totalPages) break;

    // fallback stop: if server returns less than requested, likely last page
    if (data.length < limit && hasNext !== true) break;

    page++;
    await sleep(jitter(250));
  }

  return allPatients;
};


const parseBP = (bpRaw: any) => {
  if (typeof bpRaw !== "string") return null;

  const parts = bpRaw.split("/");
  if (parts.length !== 2) return null;

  const systolicStr = parts[0]?.trim();
  const diastolicStr = parts[1]?.trim();

  if (!systolicStr || !diastolicStr) return null;

  const systolic = Number(systolicStr);
  const diastolic = Number(diastolicStr);

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;

  return { systolic, diastolic };
};

const bpScore = (bpRaw: any) => {
  const bp = parseBP(bpRaw);
  if (!bp) return 0;

  const { systolic, diastolic } = bp;

  if (systolic >= 140 || diastolic >= 90) return 4;

  if (
    (systolic >= 130 && systolic <= 139) ||
    (diastolic >= 80 && diastolic <= 89)
  )
    return 3;

  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return 2;

  if (systolic < 120 && diastolic < 80) return 1;

  return 0;
};

const toStrictNumber = (raw: any) => {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const tempScore = (tempRaw: any) => {
  const temp = toStrictNumber(tempRaw);
  if (temp === null) return 0;

  if (temp <= 99.5) return 0;
  if (temp >= 99.6 && temp <= 100.9) return 1;
  if (temp >= 101.0) return 2;

  return 0;
};

const ageScore = (ageRaw: any) => {
  const age = toStrictNumber(ageRaw);
  if (age === null) return 0;

  if (age > 65) return 2;
  return 1; // (<40) and (40-65) both = 1
};

const isInvalidBP = (bpRaw: any) => parseBP(bpRaw) === null;
const isInvalidTemp = (tempRaw: any) => toStrictNumber(tempRaw) === null;
const isInvalidAge = (ageRaw: any) => toStrictNumber(ageRaw) === null;

const uniqSorted = (arr: string[]) => Array.from(new Set(arr)).sort();

const buildAlerts = (patients: any[]) => {
  const high_risk_patients: string[] = [];
  const fever_patients: string[] = [];
  const data_quality_issues: string[] = [];

  for (const p of patients) {
    const id = String(p?.patient_id ?? "").trim();
    if (!id) continue;

    const bp = p?.blood_pressure;
    const temp = p?.temperature;
    const age = p?.age;

    const total = bpScore(bp) + tempScore(temp) + ageScore(age);

    const numericTemp = toStrictNumber(temp);

    if (total >= 4) high_risk_patients.push(id);
    if (numericTemp !== null && numericTemp >= 99.6) fever_patients.push(id);

    if (isInvalidBP(bp) || isInvalidTemp(temp) || isInvalidAge(age)) {
      data_quality_issues.push(id);
    }
  }

  return {
    high_risk_patients: uniqSorted(high_risk_patients),
    fever_patients: uniqSorted(fever_patients),
    data_quality_issues: uniqSorted(data_quality_issues),
  };
};

const submitAssessment = async (payload: {
  high_risk_patients: string[];
  fever_patients: string[];
  data_quality_issues: string[];
}) => {
  const url = `${API}/submit-assessment`;
  return requestJson("POST", url, payload);
};

const main = async () => {
  const patients = await getAllpatients();

  console.log("Total Patients Fetched", patients.length);
  console.log("First Patient:", patients?.[0]);

  const alerts = buildAlerts(patients);

  console.log(" Step 4 Outputs");
  console.log("High Risk Count:", alerts.high_risk_patients.length);
  console.log("Fever Count:", alerts.fever_patients.length);
  console.log("Data Quality Issues Count:", alerts.data_quality_issues.length);
  console.log("");
  console.log("Sample High Risk:", alerts.high_risk_patients.slice(0, 10));
  console.log("Sample Fever:", alerts.fever_patients.slice(0, 10));
  console.log("Sample Data Quality:", alerts.data_quality_issues.slice(0, 10));
  console.log("");

  const submission = await submitAssessment(alerts);
  console.log("Submission Result:", submission);
};

main().catch(console.error);
