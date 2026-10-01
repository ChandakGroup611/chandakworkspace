const fs = require('fs');

const actionsPath = 'D:/adios/lib/actions/vehicle.ts';
let code = fs.readFileSync(actionsPath, 'utf8');

// 1. In createVehicleAction
const createTarget = `    let odo = formData.odometer_km ?? 0;`;
const createInsert = `    let odo = formData.odometer_km ?? 0;

    // Date Sequence Validation
    if (reg_date && ins_exp && ins_exp < reg_date) {
      return { success: false, error: "Insurance Expiry Date cannot be earlier than Vehicle Registration Date." };
    }
    if (reg_date && puc_exp && puc_exp < reg_date) {
      return { success: false, error: "PUC Expiry Date cannot be earlier than Vehicle Registration Date." };
    }
    if (reg_date && fit_exp && fit_exp < reg_date) {
      return { success: false, error: "Fitness Expiry Date cannot be earlier than Vehicle Registration Date." };
    }
    if (reg_date && formData.custom_extended_expiry_date && formData.custom_extended_expiry_date <= reg_date) {
      return { success: false, error: "Custom Extended Expiry Date must be after Registration Date." };
    }`;

code = code.replace(createTarget, createInsert);

// 2. In updateVehicleAction
const updateTarget = `    // If registration plate changed, ensure uniqueness`;
const updateInsert = `    // Date Sequence Validation
    const updatedRegDate = updateData.registration_date;
    if (updatedRegDate) {
      if (updateData.insurance_expiry_date && updateData.insurance_expiry_date < updatedRegDate) {
        return { success: false, error: "Insurance Expiry Date cannot be earlier than Vehicle Registration Date." };
      }
      if (updateData.puc_expiry_date && updateData.puc_expiry_date < updatedRegDate) {
        return { success: false, error: "PUC Expiry Date cannot be earlier than Vehicle Registration Date." };
      }
      if (updateData.fitness_expiry_date && updateData.fitness_expiry_date < updatedRegDate) {
        return { success: false, error: "Fitness Expiry Date cannot be earlier than Vehicle Registration Date." };
      }
      if (updateData.custom_extended_expiry_date && updateData.custom_extended_expiry_date <= updatedRegDate) {
        return { success: false, error: "Custom Extended Expiry Date must be after Registration Date." };
      }
    }

    // If registration plate changed, ensure uniqueness`;

code = code.replace(updateTarget, updateInsert);

// 3. In createTripPlanAction
const tripTarget = `    const { data: trip, error } = await supabaseAdmin\n      .from("trip_plans")`;
const tripInsert = `    if (formData.planned_start_time && formData.planned_end_time && formData.planned_end_time < formData.planned_start_time) {
      return { success: false, error: "Trip End Time cannot be earlier than Trip Start Time." };
    }

    const { data: trip, error } = await supabaseAdmin\n      .from("trip_plans")`;

code = code.replace(tripTarget, tripInsert);

// 4. In createServiceRecordAction
const serviceTarget = `    const { data: record, error } = await supabaseAdmin\n      .from("service_records")`;
const serviceInsert = `    if (formData.service_date && formData.next_service_due_date && formData.next_service_due_date <= formData.service_date) {
      return { success: false, error: "Next Service Due Date must be after Service Date." };
    }
    if (formData.odometer_km !== undefined && formData.next_service_due_odometer !== undefined && formData.next_service_due_odometer <= formData.odometer_km) {
      return { success: false, error: "Next Service Due Odometer must be greater than Current Service Odometer." };
    }

    const { data: record, error } = await supabaseAdmin\n      .from("service_records")`;

code = code.replace(serviceTarget, serviceInsert);

// 5. In renewVehicleInsurancePolicyAction
const renewInsTarget = `    const { data: policy, error: insError } = await supabaseAdmin\n      .from("insurance_policies")`;
const renewInsInsert = `    if (policyData.start_date && policyData.end_date && policyData.end_date <= policyData.start_date) {
      return { success: false, error: "Policy End Date must be after Policy Start Date." };
    }

    const { data: policy, error: insError } = await supabaseAdmin\n      .from("insurance_policies")`;

code = code.replace(renewInsTarget, renewInsInsert);

// 6. In renewVehiclePucCertificateAction
const renewPucTarget = `    const { data: cert, error: pucError } = await supabaseAdmin\n      .from("puc_certificates")`;
const renewPucInsert = `    if (pucData.valid_from && pucData.valid_upto && pucData.valid_upto <= pucData.valid_from) {
      return { success: false, error: "PUC Expiry Date must be after Validity Start Date." };
    }

    const { data: cert, error: pucError } = await supabaseAdmin\n      .from("puc_certificates")`;

code = code.replace(renewPucTarget, renewPucInsert);

fs.writeFileSync(actionsPath, code, 'utf8');
console.log('Updated lib/actions/vehicle.ts with symmetrical backend date validations!');
