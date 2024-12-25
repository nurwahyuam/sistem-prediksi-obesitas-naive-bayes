let data = [];
let priorProbabilities = {};
let likelihoods = {};

function loadDataset() {
  const datasetPath = "./js/Dataset.csv";

  fetch(datasetPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Gagal memuat dataset.");
      }
      return response.text();
    })
    .then((csvText) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        complete: function (results) {
          data = results.data.filter((row) =>
            Object.values(row).some((val) => val !== null && val !== "")
          );
          calculateProbabilities();
          alert("Dataset berhasil dimuat dan probabilitas dihitung!");
        },
      });
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Dataset tidak dapat dimuat. Pastikan file Dataset.csv tersedia di direktori.");
    });
}

function calculateProbabilities() {
  if (data.length === 0) {
    alert("Dataset kosong. Harap unggah file terlebih dahulu.");
    return;
  }

  const trainingData = data.slice(0, Math.floor(data.length * 0.75));
  const targetColumn = "Diagnosa";
  const featureColumns = Object.keys(trainingData[0]).filter(
    (key) => key !== targetColumn && key.toLowerCase() !== "pegawai"
  );

  priorProbabilities = {};
  likelihoods = {};

  // Hitung prior probabilities
  trainingData.forEach((row) => {
    const target = row[targetColumn];
    priorProbabilities[target] = (priorProbabilities[target] || 0) + 1;
  });
  const totalTraining = trainingData.length;
  for (const classValue in priorProbabilities) {
    priorProbabilities[classValue] /= totalTraining;
  }

  // Hitung likelihoods
  featureColumns.forEach((feature) => {
    likelihoods[feature] = {};
    trainingData.forEach((row) => {
      const classValue = row[targetColumn];
      const featureValue = row[feature];
      likelihoods[feature][classValue] = likelihoods[feature][classValue] || {};
      likelihoods[feature][classValue][featureValue] =
        (likelihoods[feature][classValue][featureValue] || 0) + 1;
    });
    for (const classValue in likelihoods[feature]) {
      const total = priorProbabilities[classValue] * totalTraining;
      for (const featureValue in likelihoods[feature][classValue]) {
        likelihoods[feature][classValue][featureValue] /=
          total || 1e-6; // Handle divide by zero
      }
    }
  });
}

function predictAndSave() {
  const formData = {
    Nama: document.getElementById("nama").value,
    JK: document.getElementById("jenisKelamin").value,
    Usia: document.getElementById("usia").value,
    TB: document.getElementById("tinggiBadan").value,
    BB: document.getElementById("beratBadan").value,
    LP: document.getElementById("lingkarPerut").value,
    "Kurang Aktifitas Fisik": document.getElementById("kurangAktifitas").value,
    "Gula Berlebih": document.getElementById("gulaBerlebihan").value,
    "Garam Berlebih": document.getElementById("garamBerlebihan").value,
    "Lemak Berlebih": document.getElementById("lemakBerlebihan").value,
    "Kurang Makan Buah dan Sayur": document.getElementById("kurangBuahSayur").value,
  };

  if (!validateForm(formData)) {
    alert("Harap isi semua kolom sebelum melakukan prediksi.");
    return;
  }

  const probabilities = {};
  const epsilon = 1e-6; // Untuk menangani kasus probabilitas nol
  for (const classValue in priorProbabilities) {
    probabilities[classValue] = priorProbabilities[classValue];
    for (const feature in formData) {
      const featureValue = formData[feature];
      if (
        likelihoods[feature] &&
        likelihoods[feature][classValue] &&
        likelihoods[feature][classValue][featureValue] !== undefined
      ) {
        probabilities[classValue] *= likelihoods[feature][classValue][featureValue];
      } else {
        probabilities[classValue] *= epsilon; // Tangani kasus probabilitas nol
      }
    }
  }

  if (Object.keys(probabilities).length === 0) {
    alert("Probabilitas tidak dihitung dengan benar. Pastikan dataset telah dimuat.");
    return;
  }

  const predictedClass = Object.keys(probabilities).reduce(
    (a, b) => (probabilities[a] > probabilities[b] ? a : b),
    null
  );

  if (!predictedClass) {
    alert("Gagal membuat prediksi. Periksa dataset dan input data.");
    return;
  }

  document.getElementById("predictionResult").textContent = `Hasil prediksi: ${predictedClass}`;

  // Tampilkan modal hasil
  const resultModal = new bootstrap.Modal(document.getElementById("resultModal"));
  resultModal.show();
}

function validateForm(formData) {
  for (const field in formData) {
    if (!formData[field]) {
      return false;
    }
  }
  return true;
}

// Tambahkan event listener untuk memuat dataset saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", loadDataset);
