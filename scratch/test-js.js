const data = {
  custom_fields: {
    business_impact: "ok"
  }
};

const business_impact = data.business_impact || data.custom_fields?.business_impact || "";
console.log("Result:", business_impact);
