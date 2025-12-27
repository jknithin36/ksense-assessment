import { resolve } from "node:dns"

require("dotenv").config()

const API = 'https://assessment.ksensetech.com/api'

const SECRET_KEY = process.env.SECRET_KEY || "ak_430609c2de72f7dfdd771a88f09a0dba560c4b43eb7fb04e"



// utils 
const sleep= (milliSeconds: number)=> new Promise((resolve)=> setTimeout(resolve, milliSeconds));

const jitter = (milliSeoncds : number) =>  milliSeoncds + Math.floor(Math.random() * 250);

// to safer parsejson when error happens
const safeJson = async(res:Response)=>{
    try{

    return await res.json()
    }catch{
        return null
    }

}
// 
 const getPatients = async(page:number, limit:number , attempt =1)=>{


  const url = `${API}/patients?page=${page}&limit=${limit}`;


    const res = await fetch(url, {
        headers:{"x-api-key": SECRET_KEY}
    })


    // edge case - Rate Limiting
    if(res.status === 429){
        const body = await safeJson(res)
        const timeToWait = body.retry_after ?? 5;
        const waitTime = jitter(timeToWait * 1000);
        console.log(`Rate Limit Error - Wait for ${Math.ceil(waitTime / 1000)}s - Then Retry Again - Thank You  `)

        await sleep(timeToWait)
        return getPatients(page, limit, attempt)
    }


    // edgeCase - Server Issues


    if(res.status === 500 || res.status === 503){
        if(attempt >=5){
            const text = await res.text()
            throw new Error(`Server Error ${res.status} after Retires : ${text}`)
        }


        const backOffTime = jitter(500 * Math.pow(2, attempt -1));

        console.log(`${res.status} server glitch: wait for ${backOffTime}ms then retry  ${attempt + 1} (page=${page}) Thank You`);

        await sleep(backOffTime);
        return getPatients(page, limit , attempt+1)
    }




    if(!res.ok){
        const text = await res.text();
        throw new Error(`GEt Failed ${res.status}: ${text}`)
    }

    return res.json()
 }


const getAllpatients = async ()=>{
    let page = 1;
    const limit = 5;

    const allPatients: any[] =[]

    while(true){
        const response = await getPatients(page, limit);

        if(Array.isArray(response?.data)){
           
           
            allPatients.push(...response.data)
        }


        const hasNext = response?.pagination?.hasNext;

        if(!hasNext){
            break
        }
        page++

        await sleep(jitter(250))
    }


    return allPatients
}
 const main = async()=>{
    const data = await getAllpatients()
    console.log("Total Patients Fetched", data.length );
    console.log("First Patient:", data?.[0] )
 }


 main().catch(console.error)