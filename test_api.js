fetch('http://localhost:3000/api/sla')
  .then(res => res.json())
  .then(data => {
    console.log("API Response Length:", data.data ? data.data.length : data);
    console.log("Sample:", JSON.stringify(data).substring(0, 500));
  })
  .catch(err => console.error(err));
