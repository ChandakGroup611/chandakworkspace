const url = "https://cffmgqdypmilwxkwhhve.supabase.co/rest/v1/departments?select=*";

fetch(url, {
  headers: {
    "apikey": "sb_publishable_fcEzN22lzD5ro1-_hqBfFw_Bsjr7VGY",
    "Authorization": "Bearer sb_publishable_fcEzN22lzD5ro1-_hqBfFw_Bsjr7VGY"
  }
})
.then(res => res.json())
.then(data => {
  console.log("DEPARTMENTS:", JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error("ERROR:", err);
});
