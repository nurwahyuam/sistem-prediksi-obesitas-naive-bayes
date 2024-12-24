let data = [];
let priorProbabilities = {};
let likelihoods = {};

function loadDataset() {
  const datasetPath = "./Dataset.csv";

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
          displayData();
        },
      });
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Dataset tidak dapat dimuat. Periksa file dataset di direktori.");
    });
}

function displayData() {
  const trainingData = data.slice(0, Math.floor(data.length * 0.75));
  const testingData = data.slice(Math.floor(data.length * 0.75));

  showDatasetInfo();
  populateTable("trainingTable", trainingData);
  populateTable("testingTable", testingData);
  calculateProbabilities();
  calculateDataTesting();
}

function populateTable(tableId, rows) {
  const table = document.getElementById(tableId);
  table.innerHTML = ""; // Clear table

  if (rows.length === 0) {
    table.innerHTML = "<tr><td colspan='100%'>Tidak ada data</td></tr>";
    return;
  }

  // Add headers
  const headers = Object.keys(rows[0]).filter(
    (header) => header.toLowerCase() !== "pegawai"
  );
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Add rows
  rows.forEach((row) => {
    const rowElement = document.createElement("tr");
    headers.forEach((header) => {
      const cell = document.createElement("td");
      cell.textContent = row[header] ?? "";
      rowElement.appendChild(cell);
    });
    table.appendChild(rowElement);
  });
}

document.addEventListener("DOMContentLoaded", loadDataset);

function showDatasetInfo() {
  if (data.length === 0) {
    alert("Dataset kosong. Harap unggah file terlebih dahulu.");
    return;
  }

  const columnNames = Object.keys(data[0]).filter(col => col.toLowerCase() !== "pegawai");
  const numRows = data.length;
  const columnInfo = columnNames.map((col) => {
    const numMissing = data.filter((row) => row[col] == null || row[col] === "").length;
    return {
      name: col,
      missing: numMissing,
    };
  });

  const info = `
Jumlah Baris: ${numRows}
Jumlah Kolom: ${columnNames.length}
Kolom:
${columnInfo.map((col) => `- ${col.name}: ${numRows - col.missing} nilai, ${col.missing} kosong`).join("\n")}
  `;

  document.getElementById("datasetInfo").textContent = info.trim();
}

function calculateProbabilities() {
  if (data.length === 0) {
      alert("Dataset kosong. Harap unggah file terlebih dahulu.");
      return;
  }

  const trainingData = data.slice(0, Math.floor(data.length * 0.75));
  if (trainingData.length === 0) {
      alert("Data training kosong.");
      return;
  }

  const targetColumn = "Diagnosa";
  const featureColumns = Object.keys(trainingData[0]).filter(feature => feature.toLowerCase() !== "pegawai" && feature !== targetColumn);

  const classCounts = {};
  trainingData.forEach((row) => {
      const target = row[targetColumn];
      classCounts[target] = (classCounts[target] || 0) + 1;
  });

  const totalTraining = trainingData.length;
  priorProbabilities = {}; // Update global variable
  for (const [classValue, count] of Object.entries(classCounts)) {
      priorProbabilities[classValue] = count / totalTraining;
  }

  likelihoods = {}; // Update global variable
  featureColumns.forEach((feature) => {
      likelihoods[feature] = {};
      for (const classValue in classCounts) {
          likelihoods[feature][classValue] = {};
          const filteredData = trainingData.filter((row) => row[targetColumn] === classValue);
          const totalForClass = filteredData.length;

          const featureCounts = {};
          filteredData.forEach((row) => {
              const value = row[feature];
              featureCounts[value] = (featureCounts[value] || 0) + 1;
          });

          for (const [value, count] of Object.entries(featureCounts)) {
              likelihoods[feature][classValue][value] = count / totalForClass;
          }
      }
  });

  displayProbabilities(likelihoods, featureColumns, Object.keys(classCounts), priorProbabilities);
}

function displayProbabilities(likelihoods, features, classes, priors) {
  const table = document.getElementById("probabilitiesTable");
  table.innerHTML = "";

  const headerRow = document.createElement("tr");
  ["Fitur", "Nilai", ...classes].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  features.forEach((feature) => {
    const uniqueValues = new Set();
    const featureData = likelihoods[feature];

    Object.entries(featureData).forEach(([classValue, probabilities]) => {
      Object.entries(probabilities).forEach(([value, probability]) => {
        if (!uniqueValues.has(value)) {
          uniqueValues.add(value);

          const rowElement = document.createElement("tr");

          const cells = [
            feature,
            value,
            ...classes.map((cls) => (featureData[cls] && featureData[cls][value] ? featureData[cls][value].toFixed(4) : "-")),
          ];

          cells.forEach((cellValue) => {
            const cell = document.createElement("td");
            cell.textContent = cellValue;
            rowElement.appendChild(cell);
          });

          table.appendChild(rowElement);
        }
      });
    });
  });

  // Display prior probabilities
  const priorRow = document.createElement("tr");
  const priorCells = ["Diagnosa", "Prior Probabilitas", ...classes.map(cls => priors[cls] ? priors[cls].toFixed(4) : "-")];
  priorCells.forEach((cellValue) => {
    const cell = document.createElement("td");
    cell.textContent = cellValue;
    priorRow.appendChild(cell);
  });
  table.appendChild(priorRow);
}

function calculateDataTesting() {
  const table = document.getElementById("testingTableNaiveBayes");
  table.innerHTML = ""; // Clear the table

  if (data.length === 0) {
    alert("Dataset kosong. Harap unggah file terlebih dahulu.");
    return;
  }

  const trainingData = data.slice(0, Math.floor(data.length * 0.75));
  const testingData = data.slice(Math.floor(data.length * 0.75));

  if (trainingData.length === 0) {
    alert("Data training kosong.");
    return;
  }

  const targetColumn = "Diagnosa";
  const featureColumns = Object.keys(trainingData[0]).filter(
    (feature) => feature.toLowerCase() !== "pegawai" && feature !== targetColumn
  );

  // Calculate prior probabilities
  const classCounts = {};
  trainingData.forEach((row) => {
    const target = row[targetColumn];
    classCounts[target] = (classCounts[target] || 0) + 1;
  });

  const totalTraining = trainingData.length;
  const priorProbabilities = {};
  for (const [classValue, count] of Object.entries(classCounts)) {
    priorProbabilities[classValue] = count / totalTraining;
  }

  // Calculate likelihoods
  const likelihoods = {};
  featureColumns.forEach((feature) => {
    likelihoods[feature] = {};
    for (const classValue in classCounts) {
      likelihoods[feature][classValue] = {};
      const filteredData = trainingData.filter((row) => row[targetColumn] === classValue);
      const totalForClass = filteredData.length;

      const featureCounts = {};
      filteredData.forEach((row) => {
        const value = row[feature];
        featureCounts[value] = (featureCounts[value] || 0) + 1;
      });

      for (const [value, count] of Object.entries(featureCounts)) {
        likelihoods[feature][classValue][value] = count / totalForClass;
      }
    }
  });

  // Predict testing data
  let correctPredictions = 0;

  const headers = [
    "Pegawai",
    ...featureColumns,
    "Diagnosa Aktual",
    "Diagnosa Naive Bayes",
  ];
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  testingData.forEach((row) => {
    const rowElement = document.createElement("tr");

    const probabilities = {};
    for (const classValue in classCounts) {
      probabilities[classValue] = priorProbabilities[classValue];

      featureColumns.forEach((feature) => {
        const value = row[feature];
        if (likelihoods[feature][classValue][value] !== undefined) {
          probabilities[classValue] *= likelihoods[feature][classValue][value];
        } else {
          probabilities[classValue] *= 0; // Handle missing likelihood
        }
      });
    }

    const predictedClass = Object.keys(probabilities).reduce((a, b) =>
      probabilities[a] > probabilities[b] ? a : b
    );

    if (predictedClass === row[targetColumn]) {
      correctPredictions++;
    }

    headers.forEach((header) => {
      const cell = document.createElement("td");
      if (header === "Diagnosa Naive Bayes") {
        cell.textContent = predictedClass;
      } else if (header === "Diagnosa Aktual") {
        cell.textContent = row[targetColumn];
      } else {
        cell.textContent = row[header] ?? "";
      }
      rowElement.appendChild(cell);
    });

    table.appendChild(rowElement);
  });

  // Calculate and display accuracy
  const accuracy = (correctPredictions / testingData.length) * 100;
  const accuracyElement = document.getElementById("accuracy");

  if (isNaN(accuracy)) {
    accuracyElement.textContent = "Akurasi tidak dapat dihitung. Periksa dataset Anda.";
  } else {
    accuracyElement.textContent = `Akurasi: ${accuracy.toFixed(2)}% (${correctPredictions}/${testingData.length})`;
  }
}

function predictAndSave() {
  const formData = {
      Nama: document.getElementById("nama").value,
      JenisKelamin: document.getElementById("jenisKelamin").value,
      Usia: document.getElementById("usia").value,
      TinggiBadan: document.getElementById("tinggiBadan").value,
      BeratBadan: document.getElementById("beratBadan").value,
      LingkarPerut: document.getElementById("lingkarPerut").value,
      KurangAktifitas: document.getElementById("kurangAktifitas").value,
      GulaBerlebihan: document.getElementById("gulaBerlebihan").value,
      GaramBerlebihan: document.getElementById("garamBerlebihan").value,
      LemakBerlebihan: document.getElementById("lemakBerlebihan").value,
      KurangBuahSayur: document.getElementById("kurangBuahSayur").value,
  };

  // Validasi jika form kosong
  if (!Object.values(formData).every((value) => value !== "")) {
      alert("Harap lengkapi semua field sebelum melakukan prediksi!");
      return;
  }

  const probabilities = {};

  for (const classValue in priorProbabilities) {
      probabilities[classValue] = priorProbabilities[classValue];

      for (const feature in formData) {
          if (
              feature !== "Nama" &&
              likelihoods[feature] &&
              likelihoods[feature][classValue]
          ) {
              const value = formData[feature];
              probabilities[classValue] *= likelihoods[feature][classValue][value] || 0; // Handle missing likelihood
          }
      }
  }

  const predictedClass = Object.keys(probabilities).reduce((a, b) =>
      probabilities[a] > probabilities[b] ? a : b
  );

  if (!predictedClass) {
      alert("Prediksi gagal dilakukan. Harap periksa kembali input dan data training.");
      return;
  }

  document.getElementById("predictionResult").textContent = `Prediksi: ${predictedClass}`;

  const storedData = JSON.parse(localStorage.getItem("userData")) || [];
  formData.Prediksi = predictedClass;
  storedData.push(formData);
  localStorage.setItem("userData", JSON.stringify(storedData));

  alert(`Data berhasil disimpan dengan prediksi: ${predictedClass}`);
}

function viewStoredData() {
  const storedData = JSON.parse(localStorage.getItem("userData")) || [];
  const table = document.getElementById("storedDataTable");
  table.innerHTML = "";

  if (storedData.length === 0) {
    table.innerHTML = "<tr><td colspan='100%'>Belum ada data tersimpan.</td></tr>";
    return;
  }

  // Add headers
  const headers = Object.keys(storedData[0]);
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Add rows
  storedData.forEach((row) => {
    const rowElement = document.createElement("tr");
    headers.forEach((header) => {
      const cell = document.createElement("td");
      cell.textContent = row[header];
      rowElement.appendChild(cell);
    });
    table.appendChild(rowElement);
  });
}
