import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

const API_URL = "http://localhost:5001/api/motorcycles";

const form = new FormData();
form.append("unitId", "UNIT-TEST2");
form.append("make", "Honda");
form.append("model", "Test Model");
form.append("category", "Scooter");
form.append("year", "2020");
form.append("engineSize", "150");
form.append("fuelType", "Unleaded");
form.append("transmission", "Manual");
form.append("hasABS", "false");
form.append("hasHelmet", "true");
form.append("dailyRate", "500");
form.append("description", "Test description");

// Add a dummy image file
const imagePath = "/Users/admin/Desktop/Motorcycle Rental System (04-15-26) - De Ocampo/backend/uploads/1777722303989-812660332.png"; // Use existing image
if (fs.existsSync(imagePath)) {
  form.append("image", fs.createReadStream(imagePath), "test-image.jpg");
} else {
  console.log("Test image not found, skipping image upload");
}

async function addMotorcycle() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    console.log("✅ Motorcycle added:", data);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

addMotorcycle();