import fetch from "node-fetch";

const API_URL = "http://192.168.1.165:5001/api/motorcycles";

const newMotorcycle = {
  make: "KTM",
  model: "Duke 390",
  category: "Sport",
  year: 2024,
  engineSize: 373,
  fuelType: "Unleaded",
  transmission: "Manual",
  hasABS: true,
  hasHelmet: true,
  dailyRate: 1100,
  description: "Lightweight sport bike with agile handling and powerful engine, perfect for city and twisty roads.",
  image: "2024-KTM-Duke-390.png",
  status: "available"
};

async function addMotorcycle() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newMotorcycle)
    });

    const data = await res.json();
    console.log("✅ Motorcycle added:", data);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

addMotorcycle();


//FOR TESTING PURPOSES ONLY, NOT TO BE USED IN PRODUCTION