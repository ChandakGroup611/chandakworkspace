const { Client } = require('pg'); 

async function main() { 
    const client = new Client({ connectionString: 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' }); 
    await client.connect(); 
    
    const res = await client.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`); 
    
    let tablesWithData = [];
    for(const row of res.rows) { 
        try {
            const countRes = await client.query(`SELECT count(*) FROM public.${row.tablename}`); 
            const count = parseInt(countRes.rows[0].count);
            if(count > 0) {
                console.log(row.tablename + ': ' + count);
                tablesWithData.push(row.tablename);
            }
        } catch (e) {
            // console.log(row.tablename + ': ERROR ' + e.message);
        }
    } 
    console.log("Tables with data:", tablesWithData.join(", "));
    await client.end(); 
} 

main().catch(console.error);
