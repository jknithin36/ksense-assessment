# ksense-assessment

I am Sharing my Approach to be clear 



-COMMIT ONE

Created a function that call the Api and fetches the list of patients to check if api is working 


-- Output

```bash
@jknithin36 ➜ /workspaces/ksense-assessment (main) $ npx ts-node src/index.ts
[dotenv@17.2.3] injecting env (1) from .env -- tip: 🔑 add access controls to secrets: https://dotenvx.com/ops
Sample response keys [ 'data', 'pagination', 'metadata' ]
First Patient: {
  patient_id: 'DEMO001',
  name: 'TestPatient, John',
  age: 45,
  gender: 'M',
  blood_pressure: '120/80',
  temperature: 98.6,
  visit_date: '2024-01-15',
  diagnosis: 'Sample_Hypertension',
  medications: 'DemoMed_A 10mg, TestDrug_B 500mg'
}
```




COMMIT - 2

updated the code to loop though all available pages instead of stoppung at firstOne

This Way - every patient data is collected into si gle list before moving on to processing 

and then handled rateLimit and retry Handiling EdgeCases ( created two Utilty functions to for Undertsanding of Errors )


Output -


```bash
Rate Limit Error - Wait for 4s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 4s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 4s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 3s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 3s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 3s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 3s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 3s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 3s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 2s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 2s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 2s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 2s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 2s - Then Retry Again - Thank You  
Rate Limit Error - Wait for 2s - Then Retry Again - Thank You  
Total Patients Fetched 40
First Patient: {
  patient_id: 'DEMO001',
  name: 'TestPatient, John',
  age: 45,
  gender: 'M',
  blood_pressure: '120/80',
  temperature: 98.6,
  visit_date: '2024-01-15',
  diagnosis: 'Sample_Hypertension',
  medications: 'DemoMed_A 10mg, TestDrug_B 500mg'
}

```



- Commit -3 