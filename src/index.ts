require("dotenv").config()

const API = 'https://assessment.ksensetech.com/api'

const SECRET_KEY = process.env.SECRET_KEY || "ak_430609c2de72f7dfdd771a88f09a0dba560c4b43eb7fb04e"



 const getPatients = async(page:number, limit:number)=>{


   const url = `${API}/patients?page=${page}&limit=${limit}`;


    const res = await fetch(url, {
        headers:{"x-api-key": SECRET_KEY}
    })


    if(!res.ok){
        const text = await res.text();
        throw new Error(`GEt Failed ${res.status}: ${text}`)
    }

    return res.json()
 }


 const main = async()=>{
    const data = await getPatients(1,5);
    console.log("Sample response keys", Object.keys(data));
    console.log("First Patient:", data.data?.[0] )
 }


 main().catch(console.error)