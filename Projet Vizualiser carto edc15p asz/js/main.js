const rpmLabels = [0, 550, 551, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 5250];

function getLineData(rowLabel) {
  return rpmLabels.map((_, index) => {
    const input = getInput(rowLabel, index + 1);
    return input ? parseFloat(input.value.replace(",", ".")) || null : null;
  });
}

function createChart(ctx, label, color, rowLabel, yLabel) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: rpmLabels,
      datasets: [{
        label: `${label}`,
        data: getLineData(rowLabel),
        borderColor: color,
        backgroundColor: 'transparent',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 1
      }]
    },
    options: {
      animation: false,
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'RPM' }, ticks: { autoSkip: false } },
        y: { title: { display: true, text: yLabel } }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'var(--color-fg)',
            usePointStyle: true,
            pointStyle: 'line',
            font: { size: 12 }
          }
        }
      }
    }
  });
}

const afrChart   = createChart(document.createElement('canvas').getContext('2d'), 'AFR', 'red', 'AFR', 'AFR');
const iqChart    = createChart(document.createElement('canvas').getContext('2d'), 'IQ', 'red', 'IQ', 'IQ');
const boostChart = createChart(document.createElement('canvas').getContext('2d'), 'Boost', 'red', 'Boost', 'Boost');
const soiChart   = createChart(document.createElement('canvas').getContext('2d'), 'SOI', 'red', 'SOI', 'SOI');
const tiChart    = createChart(document.createElement('canvas').getContext('2d'), 'TIdeg', 'red', 'TIdeg', 'TIdeg');
const atdcChart  = createChart(document.createElement('canvas').getContext('2d'), 'ATDC', 'red', 'ATDC', 'ATDC');
const timsChart  = createChart(document.createElement('canvas').getContext('2d'), 'TIms', 'red', 'TIms', 'TIms (ms)');
const n75Chart   = createChart(document.createElement('canvas').getContext('2d'), 'N75', 'red', 'N75', 'N75 (%)');

const rowLabels = ["AFR", "IQ", "Boost", "SOI", "TIdeg", "ATDC", "TIms", "N75"];
const rpmList = [0, 550, 551, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 5250];
const R = 287.05;
const cylindreeCm3 = 1896 / 4;
const table = document.getElementById('mapTable').getElementsByTagName('tbody')[0];

function getColorByRatioTI(ratio) {
  if (!isFinite(ratio)) return "black";
  if (ratio > 1) return "red";
  if (ratio > 0.99) return "orange";
  if (ratio > 0.90) return "orange";
  if (ratio > 0.80) return "gold";
  return "green";
}

function setInputColor(input, color) {
  input.style.color = color;
}

function getInput(row, col) {
  return document.querySelector(`input[data-row='${row}'][data-col='${col}']`);
}

function clearInput(row, col) {
  const input = getInput(row, col);
  if (input) {
    input.value = "";
    localStorage.removeItem(`${row}_${col}`);
  }
}

function setInputAndStore(row, col, value, decimals = 2) {
  const input = getInput(row, col);
  if (input && value !== null && !isNaN(value)) {
    const fixed = value.toFixed(decimals);
    input.value = fixed;
    localStorage.setItem(`${row}_${col}`, fixed);
  }
}

function calculateAFR(iq, boost, rpm) {
  const R = 287.05;
  const cyl = 1896 / 4 / 1e6;
  const T = 300;
  const air = (boost * 100000 * cyl) / (R * T);
  const fuel = iq / 1e6;
  return fuel > 0 ? air / fuel : NaN;
}

function applyComputedValue(row, col, computeFn, decimals = 2, ratioFn = null) {
  const result = computeFn(col);
  if (result !== null && !isNaN(result)) {
    setInputAndStore(row, col, result, decimals);
    if (ratioFn) {
      const ratio = ratioFn(result, col);
      const input = getInput(row, col);
      setInputColor(input, getColorByRatioTI(ratio));
    }
  }
}

function computeAFR(col) {
  const iq = parseFloat(getInput("IQ", col)?.value.replace(",", "."));
  const boost = parseFloat(getInput("Boost", col)?.value.replace(",", "."));
  if (isNaN(iq) || isNaN(boost)) return null;
  return calculateAFR(iq, boost, rpmList[col - 1]);
}
function updateAFR(col) {
  applyComputedValue("AFR", col, computeAFR, 2);
}

function computeTIms(col) {
  const ti = parseFloat(getInput("TIdeg", col)?.value.replace(",", "."));
  const rpm = rpmList[col - 1];
  if (isNaN(ti)) return null;
  return (ti * 60000) / (rpm * 360);
}
function ratioTIms(ms, col) {
  const rpm = rpmList[col - 1];
  const msMax = (60000 * 35) / (rpm * 360);
  return ms / msMax;
}
function updateTIms(col) {
  applyComputedValue("TIms", col, computeTIms, 3, ratioTIms);
}

function computeATDC(col) {
  const soi = parseFloat(getInput("SOI", col)?.value.replace(",", "."));
  const ti = parseFloat(getInput("TIdeg", col)?.value.replace(",", "."));
  if (isNaN(soi) || isNaN(ti)) return null;
  return soi + ti;
}
function ratioATDC(atdc, col) {
  const rpm = rpmList[col - 1];
  const max = rpm >= 5000 ? 5 : rpm > 2200 ? 10 - ((rpm - 2200) * 5 / 2800) : 10;
  return atdc / max;
}
function updateATDC(col) {
  applyComputedValue("ATDC", col, computeATDC, 2, ratioATDC);
}

function computeN75(col) {
  const iq = parseFloat(getInput("IQ", col)?.value.replace(",", "."));
  const rpm = rpmList[col - 1];
  if (isNaN(iq) || isNaN(rpm)) return null;

  return interpolateFromTable(rpm, iq, n75RPM, n75MG, n75Table);
}
function updateN75(col) {
  applyComputedValue("N75", col, computeN75, 2);
}

function handleIQChange(col) {
  const val = getInput("IQ", col)?.value.trim().replace(",", ".");
  const iq = parseFloat(val);
  const rpm = rpmList[col - 1];

  if (val === "" || iq === 0) {
    ["Boost", "SOI", "TIdeg", "AFR", "ATDC", "TIms"].forEach(row => clearInput(row, col));
    return;
  }

  if (!isNaN(iq)) {
    const boost = interpolateFromTable(rpm, iq, boostRPM, boostMG, boostTable);
    const soi = interpolateFromTable(rpm, iq, soiRPM, soiMG, soiTable);
    const ti = interpolateFromTable(rpm, iq, tiRPM, tiMG, tiTable);

    setInputAndStore("Boost", col, boost);
    setInputAndStore("SOI", col, soi);
    setInputAndStore("TIdeg", col, ti);

    updateATDC(col);
    updateTIms(col);
    updateAFR(col);
    updateN75(col);
  }
}

function onInputChange(e) {
  const row = e.target.dataset.row;
  const col = parseInt(e.target.dataset.col);
  if (!e.target.readOnly) localStorage.setItem(`${row}_${col}`, e.target.value);

  if (row === "IQ") handleIQChange(col);
  if (row === "SOI" || row === "TIdeg") updateATDC(col);
  if (row === "TIdeg") updateTIms(col);
}

for (let i = 0; i < rowLabels.length; i++) {
  const row = table.rows[i];
  for (let j = 1; j <= 21; j++) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.row = rowLabels[i];
    input.dataset.col = j;
    if (["AFR", "ATDC", "TIms", "N75"].includes(rowLabels[i])) input.readOnly = true;

    const saved = localStorage.getItem(`${rowLabels[i]}_${j}`);
    if (saved !== null) input.value = saved;

    input.addEventListener('input', onInputChange);
    cell.appendChild(input);
    row.appendChild(cell);

    if (rowLabels[i] === "TIdeg") {
      setTimeout(() => input.dispatchEvent(new Event("input", { bubbles: true })), 0);
    }
  }
}

function clearValuesOnly() {
  if (confirm("Effacer uniquement les valeurs du tableau ?")) {
    for (let i = 0; i < rowLabels.length; i++) {
      if (["AFR", "IQ", "Boost", "SOI", "TIdeg", "ATDC", "TIms", "N75"].includes(rowLabels[i])) {
        for (let j = 1; j <= 21; j++) {
          clearInput(rowLabels[i], j);
        }
      }
    }
  }
}

function resetTable() {
  if (confirm("Effacer toutes les données du tableau et recharger la page ?")) {
    const iqBackup = [];
    for (let j = 1; j <= 21; j++) {
      const val = document.querySelector(`input[data-row='IQ'][data-col='${j}']`)?.value || "";
      iqBackup.push(val);
    }

    sessionStorage.setItem("iq_restore", JSON.stringify(iqBackup));

    const rowLabels = ["AFR", "IQ", "Boost", "SOI", "TIdeg", "ATDC", "TIms", "N75"];
    for (let i = 0; i < rowLabels.length; i++) {
      for (let j = 1; j <= 21; j++) {
        localStorage.removeItem(`${rowLabels[i]}_${j}`);
        const input = document.querySelector(`input[data-row='${rowLabels[i]}'][data-col='${j}']`);
        if (input) input.value = "";
      }
    }
    location.reload();
  }
}
  
document.querySelectorAll("input").forEach(input => {
  input.addEventListener("paste", handlePaste);
  input.addEventListener("input", handleInputUpdate);
});

function handlePaste(e) {
  e.preventDefault();
  const startRow = this.dataset.row;
  const startCol = parseInt(this.dataset.col);
  const clipboard = e.clipboardData.getData("text");

  const lines = clipboard.split("\n").filter(line => line.trim() !== "");

  lines.forEach((line, i) => {
    const values = line.split("\t");
    values.forEach((val, j) => {
      const targetInput = getInput(startRow, startCol + j);
      if (targetInput && !targetInput.readOnly) {
        targetInput.value = val.trim();
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  });
}

function handleInputUpdate() {
  for (const [label, chart] of Object.entries(charts)) {
    const newData = getLineData(label);
    if (Array.isArray(newData)) {
      chart.data.datasets[0].data = newData;
      chart.update();
    }
  }
}

window.addEventListener("load", () => {
  const headers = document.querySelectorAll("#mapTable thead th");
  let tooltip;

  headers.forEach((th, index) => {
    const savedWidth = localStorage.getItem("col_width_" + index);
    if (savedWidth) th.style.width = savedWidth + "px";

    if (index > 0) {
      const rpm = parseInt(th.textContent);
      if (!isNaN(rpm) && rpm > 0) {
        const msPerDeg = 60000 / (rpm * 360);
        const tiMaxMs = (rpm <= 2000) ? msPerDeg * 35 :
                        (rpm >= 5000) ? msPerDeg * 30 :
                        msPerDeg * (35 - ((rpm - 2000) * 5 / 3000));
        const eoiMax = (rpm <= 2000) ? 10 :
                       (rpm >= 5000) ? 5 :
                       10 - ((rpm - 2000) * 5 / 3000);

        const tooltipText =
          `${rpm} RPM = ${(60000 / rpm).toFixed(2)} ms/tour\n` +
          `→ ${msPerDeg.toFixed(4)} ms/°CA\n` +
          `→ EOI max conseillé = ${eoiMax.toFixed(2)}° ATDC\n` +
          `→ TI max = ${tiMaxMs.toFixed(2)} ms`;

        th.addEventListener("mouseenter", () => {
          if (tooltip) tooltip.remove();

          tooltip = document.createElement("div");
          tooltip.className = "instant-tooltip";
          tooltip.textContent = tooltipText;
          document.body.appendChild(tooltip);

          const rect = th.getBoundingClientRect();
          let left = rect.left + rect.width / 2;
          let top = rect.bottom + 5;

          const tooltipWidth = 200;
          const margin = 10;
          if (left + tooltipWidth / 2 > window.innerWidth - margin) {
            left = window.innerWidth - tooltipWidth / 2 - margin;
          }
          if (left - tooltipWidth / 2 < margin) {
            left = tooltipWidth / 2 + margin;
          }

          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        });

        th.addEventListener("mouseleave", () => {
          if (tooltip) {
            tooltip.remove();
            tooltip = null;
          }
        });
      }
    }
  });
});

function createIQTooltip(iq) {
  const scenarios = {
    "15°C (standard)": 835,                
    "25°C (ville/hiver moteur chaud)": 827,
    "50°C (été / autoroute)": 810          
  };

  const mm3 = iq / 835 * 1000;
  const header = `Consigne IQ = ${iq.toFixed(2)} mg\nVolume injecté ~ ${mm3.toFixed(1)} mm³`;

  const lines = Object.entries(scenarios).map(([label, rho]) => {
    const realMg = mm3 * rho / 1000;
    return `${label} ~ ${realMg.toFixed(2)} mg réels`;
  });

  return `${header}\n` + lines.join("\n");
}

document.querySelectorAll("input[data-row='IQ']").forEach(input => {
  input.addEventListener("mouseenter", () => {
    const val = parseFloat(input.value.replace(",", "."));
    if (!isNaN(val)) {
      const tooltip = document.createElement("div");
      tooltip.className = "instant-tooltip";
      tooltip.textContent = createIQTooltip(val);
      document.body.appendChild(tooltip);

      const rect = input.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.bottom + 6}px`;

      input._tooltip = tooltip;
    }
  });

  input.addEventListener("mouseleave", () => {
    if (input._tooltip) {
      input._tooltip.remove();
      delete input._tooltip;
    }
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const table = document.querySelector("table");
  const rows = [...table.rows];
  const header = rows[0].cells;
  const rpmList = [...header].slice(1).map(cell => parseFloat(cell.innerText));

  const rowLabels = ["IQ", "Boost", "SOI", "TI"];
  const inputCache = {};

  for (let col = 1; col <= rpmList.length; col++) {
    inputCache[col] = {
      afr: getInput("AFR", col),
      atdc: getInput("ATDC", col),
      ti: getInput("TIdeg", col)
    };

    updateTIms(col);

    const soi = parseFloat(localStorage.getItem(`SOI_${col}`));
    const ti = parseFloat(localStorage.getItem(`TIdeg_${col}`));
    if (!isNaN(soi) && !isNaN(ti) && inputCache[col].atdc) {
      updateATDC(col);
    }

    if (inputCache[col].afr) updateAFR(col);
  }

  const restoreIQ = sessionStorage.getItem("iq_restore");
  if (restoreIQ) {
    const values = JSON.parse(restoreIQ);
    values.forEach((val, idx) => {
      const input = getInput("IQ", idx + 1);
      if (input) {
        input.value = val;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    sessionStorage.removeItem("iq_restore");
  }

  for (let col = 1; col <= rpmList.length; col++) {
    const tiInput = inputCache[col]?.ti;
    if (tiInput) {
      tiInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
});

const boostRPM = [0,20,1000,1250,1500,1750,2000,2250,2500,2750,3000,3250,3500,4000,4500,4750,5000];
const boostMG = [0,11,22,33,44,55,66,77,99,110];
const boostTable = [
  [0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20],
  [1.00, 2.42, 2.46, 2.51, 2.55, 2.63, 2.71, 2.71, 2.71, 2.71],
  [1.00, 2.42, 2.47, 2.51, 2.56, 2.63, 2.71, 2.71, 2.71, 2.71],
  [1.00, 2.42, 2.48, 2.53, 2.58, 2.64, 2.73, 2.86, 3.11, 3.11],
  [1.00, 2.45, 2.51, 2.58, 2.66, 2.74, 2.85, 3.01, 3.31, 3.44],
  [1.00, 2.47, 2.55, 2.64, 2.72, 2.83, 2.97, 3.16, 3.40, 3.60],
  [1.00, 2.49, 2.57, 2.67, 2.75, 2.87, 3.02, 3.21, 3.46, 3.65],
  [1.00, 2.50, 2.58, 2.68, 2.77, 2.90, 3.04, 3.23, 3.50, 3.67],
  [1.01, 2.52, 2.60, 2.70, 2.80, 2.92, 3.06, 3.26, 3.55, 3.70],
  [1.02, 2.54, 2.62, 2.72, 2.82, 2.94, 3.08, 3.27, 3.55, 3.70],
  [1.06, 2.58, 2.68, 2.78, 2.89, 3.00, 3.13, 3.31, 3.58, 3.70],
  [1.08, 2.58, 2.69, 2.79, 2.89, 3.00, 3.14, 3.31, 3.58, 3.70],
  [1.10, 2.58, 2.69, 2.80, 2.90, 3.01, 3.14, 3.31, 3.56, 3.66],
  [1.12, 2.58, 2.69, 2.80, 2.90, 3.01, 3.14, 3.32, 3.51, 3.61],
  [1.15, 2.58, 2.69, 2.80, 2.90, 3.00, 3.14, 3.31, 3.49, 3.58],
  [1.20, 2.58, 2.68, 2.79, 2.89, 3.01, 3.13, 3.25, 3.46, 3.54]
];

const soiRPM = [100, 400, 800, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3500, 4000, 4250, 5000];
const soiMG  = [0, 11, 22, 33, 44, 55, 62, 66, 77, 88, 99, 110, 121, 132];
const soiTable = [
  [-7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99, -7.99],
  [1.01, 1.01, 1.01, -0.49, -3.00, -7.22, -11.11, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00],
  [1.01, 1.01, 1.01, -0.49, -3.00, -7.22, -11.11, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00],
  [1.01, 1.01, 1.01, -0.49, -3.00, -7.22, -11.11, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00],
  [-0.49, -0.49, -0.49, -0.49, -3.00, -7.22, -11.11, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00, -15.00],
  [-1.50, -1.50, -1.50, -1.50, -3.00, -7.22, -7.97, -8.74, -9.96, -10.74, -11.25, -11.51, -11.51, -11.51],
  [-3.00, -3.00, -3.00, -3.00, -4.95, -7.22, -7.99, -8.77, -9.96, -10.74, -11.25, -11.51, -11.51, -11.51],
  [-4.50, -4.50, -4.50, -4.50, -6.70, -8.04, -8.74, -9.45, -10.22, -10.99, -11.51, -12.24, -12.24, -12.24],
  [-5.72, -5.72, -5.72, -6.49, -8.06, -9.05, -9.77, -10.50, -11.23, -12.00, -12.49, -13.01, -13.01, -13.01],
  [-6.96, -6.96, -6.96, -7.74, -9.40, -10.22, -10.85, -11.51, -12.24, -13.01, -13.52, -14.02, -14.02, -14.02],
  [-8.25, -8.25, -8.25, -9.02, -10.43, -11.37, -12.05, -12.73, -13.48, -14.25, -14.77, -15.28, -15.28, -15.28],
  [-9.00, -9.00, -9.00, -9.99, -11.46, -12.47, -13.08, -13.71, -14.49, -15.24, -16.01, -16.50, -16.50, -16.50],
  [-10.76, -10.76, -10.76, -12.00, -13.45, -14.60, -15.17, -15.70, -16.74, -17.51, -18.26, -19.22, -19.22, -19.22],
  [-12.49, -12.49, -12.49, -13.97, -15.49, -16.71, -17.18, -17.67, -18.70, -19.48, -20.86, -21.09, -21.31, -21.52],
  [-13.48, -13.48, -13.48, -14.88, -16.38, -17.70, -18.19, -18.68, -19.69, -20.46, -21.75, -22.08, -22.24, -22.41],
  [-16.22, -16.22, -16.22, -17.72, -19.29, -20.58, -21.12, -21.68, -22.71, -23.74, -24.24, -24.24, -24.24, -24.24]
];

const tiRPM = [100, 200, 600, 800, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 3800, 4000, 4500, 5000];
const tiMG  = [1, 4, 11, 15, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132];
const tiTable = [
  [4.95, 7.27, 9.33, 10.43, 11.37, 12.07, 13.31, 14.53, 15.98, 16.97, 18.23, 19.59, 20.67, 21.96, 23.79],
  [4.83, 6.87, 8.91, 9.80, 10.69, 11.46, 12.54, 13.83, 15.26, 16.17, 17.46, 18.82, 19.80, 21.07, 22.71],
  [3.68, 5.18, 6.59, 7.45, 8.27, 9.14, 9.94, 11.30, 12.42, 13.50, 14.69, 15.84, 16.83, 18.05, 19.27],
  [2.72, 3.77, 5.37, 6.14, 6.96, 7.85, 8.77, 10.12, 11.37, 12.63, 13.78, 15.14, 16.12, 17.41, 18.89],
  [-0.47, 2.44, 4.29, 5.16, 5.91, 6.91, 8.09, 9.54, 10.87, 12.12, 13.83, 15.12, 16.38, 17.81, 19.17],
  [-1.01, 1.29, 3.40, 4.59, 5.23, 6.49, 7.99, 9.28, 10.83, 12.28, 14.04, 15.54, 16.73, 18.26, 19.76],
  [-1.27, 0.66, 2.79, 4.03, 4.87, 6.23, 7.99, 9.23, 10.97, 12.68, 14.30, 15.96, 17.46, 19.15, 20.69],
  [-1.52, 0.19, 2.25, 3.54, 4.59, 5.95, 7.85, 9.68, 11.44, 13.34, 14.74, 16.73, 18.33, 19.90, 21.52],
  [-1.66, -0.14, 1.66, 2.91, 4.31, 5.84, 7.87, 10.15, 11.95, 13.90, 15.37, 17.39, 18.94, 20.72, 22.64],
  [-2.16, -0.73, 0.89, 2.25, 3.59, 5.60, 8.09, 10.73, 12.75, 15.00, 16.59, 18.54, 20.41, 22.27, 24.59],
  [-2.51, -1.27, 0.28, 1.69, 2.98, 5.30, 8.02, 11.41, 13.62, 15.77, 17.74, 19.78, 22.27, 24.44, 26.65],
  [-3.05, -1.76, -0.28, 1.15, 2.32, 4.83, 7.43, 11.67, 14.51, 16.78, 18.96, 21.73, 24.54, 27.30, 29.60],
  [-3.30, -1.90, -0.66, 0.77, 1.80, 4.41, 7.29, 11.60, 14.74, 17.18, 19.57, 22.71, 26.02, 28.80, 30.77],
  [-3.26, -2.02, -0.70, 0.59, 1.48, 4.12, 7.22, 11.39, 14.72, 17.32, 19.97, 23.20, 26.62, 29.39, 31.26],
  [-3.52, -1.99, -0.98, -0.45, 0.26, 2.84, 6.37, 10.17, 13.83, 17.41, 20.79, 24.47, 28.03, 30.66, 32.20],
  [-3.63, -2.34, -1.50, -0.98, -0.52, 2.23, 5.72, 9.00, 13.08, 16.87, 21.09, 24.82, 28.83, 31.22, 33.07]
];

const n75RPM = [760, 780, 1000, 1150, 1300, 1500, 1650, 1750, 1900, 2000, 2250, 2500, 3000, 4000, 4500, 5000];
const n75MG  = [0, 5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 120, 140];
const n75Table = [
  [75.00, 75.00, 75.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00],
  [75.00, 75.00, 75.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00],
  [75.00, 75.00, 75.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00],
  [75.00, 75.00, 75.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00, 80.00],
  [72.00, 72.00, 72.00, 72.00, 72.00, 69.00, 62.00, 60.00, 60.00, 60.00, 60.00, 60.00, 60.00],
  [66.00, 66.00, 66.00, 62.66, 59.66, 55.66, 53.00, 53.00, 52.00, 52.00, 52.00, 52.00, 52.00],
  [63.00, 63.00, 63.00, 59.32, 56.76, 52.38, 47.88, 46.00, 45.00, 43.87, 42.75, 41.62, 40.50],
  [61.00, 61.00, 61.00, 57.26, 54.76, 50.38, 41.00, 42.56, 43.06, 41.98, 40.90, 39.83, 38.75],
  [58.50, 58.50, 58.50, 53.98, 51.48, 47.60, 39.16, 38.22, 38.22, 37.26, 36.30, 35.35, 34.39],
  [56.50, 56.50, 56.50, 51.60, 49.10, 45.10, 38.66, 33.94, 34.94, 34.06, 33.19, 32.31, 31.44],
  [54.00, 54.00, 54.00, 48.94, 46.94, 42.66, 34.16, 32.44, 30.13, 29.37, 28.62, 27.87, 27.11],
  [51.00, 51.00, 51.00, 46.50, 44.50, 40.22, 31.94, 31.28, 29.41, 28.67, 27.93, 27.16, 26.43],
  [50.00, 49.00, 47.20, 43.10, 41.22, 36.66, 30.16, 28.94, 27.86, 27.16, 26.46, 26.09, 25.39],
  [46.88, 43.38, 40.26, 36.66, 34.60, 30.10, 26.00, 25.00, 25.50, 24.86, 24.22, 23.88, 23.25],
  [44.62, 40.61, 37.18, 34.11, 31.93, 25.74, 23.66, 23.66, 23.16, 22.50, 22.45, 22.14, 21.52],
  [42.88, 38.86, 35.47, 32.34, 30.16, 23.81, 21.91, 21.91, 21.41, 20.75, 20.27, 19.98, 19.33]
];

function bilinearInterp(x, y, x0, x1, y0, y1, Q11, Q21, Q12, Q22) {
  const denom = (x1 - x0) * (y1 - y0);
  return (
    Q11 * (x1 - x) * (y1 - y) +
    Q21 * (x - x0) * (y1 - y) +
    Q12 * (x1 - x) * (y - y0) +
    Q22 * (x - x0) * (y - y0)
  ) / denom;
}

function interpolateFromTable(rpm, mg, rpmList, mgList, table) {
  let i = rpmList.findIndex((v, idx) =>
    idx + 1 < rpmList.length && rpm >= v && rpm <= rpmList[idx + 1]
  );
  if (i === -1) i = rpm >= rpmList[rpmList.length - 1] ? rpmList.length - 2 : 0;

  let j = mgList.findIndex((v, idx) =>
    idx + 1 < mgList.length && mg >= v && mg <= mgList[idx + 1]
  );
  if (j === -1) j = mg >= mgList[mgList.length - 1] ? mgList.length - 2 : 0;

  const clampedRpm = Math.max(rpmList[0], Math.min(rpm, rpmList[rpmList.length - 1]));
  const clampedMg  = Math.max(mgList[0],  Math.min(mg,  mgList[mgList.length - 1]));

  i = Math.min(i, table.length - 2);
  j = Math.min(j, table[0].length - 2);

  return bilinearInterp(
    clampedRpm,
    clampedMg,
    rpmList[i], rpmList[i + 1],
    mgList[j], mgList[j + 1],
    table[i][j], table[i + 1][j], table[i][j + 1], table[i + 1][j + 1]
  );
}

const charts = {
  AFR: afrChart,
  IQ: iqChart,
  Boost: boostChart,
  SOI: soiChart,
  TIdeg: tiChart,
  ATDC: atdcChart,
  TIms: timsChart,
  N75: n75Chart
};

let hoverChartInstance = null;
const hoverCanvas = document.getElementById("hoverChart");
const hoverCtx = hoverCanvas.getContext("2d");
const hoverContainer = document.getElementById("hoverChartContainer");

let isOverLabel = false;
let isOverChart = false;

function showHoverChart(rowLabel, x, y) {
  if (!charts[rowLabel]) return;

  if (hoverChartInstance) {
    hoverChartInstance.destroy();
  }

  const datasets = charts[rowLabel].data.datasets.map(ds => ({
    ...ds,
    data: [...ds.data]
  }));

  hoverChartInstance = new Chart(hoverCtx, {
    type: 'line',
    data: {
      labels: rpmLabels,
      datasets: datasets
    },
    options: {
      animation: false,
      responsive: false,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          title: { display: true, text: 'RPM' },
          ticks: { autoSkip: true }
        },
        y: {
          title: { display: false },
          ticks: { autoSkip: true }
        }
      }
    }
  });

  hoverContainer.style.display = 'block';

  const containerWidth = hoverContainer.offsetWidth;
  const containerHeight = hoverContainer.offsetHeight;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = x + 20;
  let top = y + 20;

  if (left + containerWidth > viewportWidth) {
    left = viewportWidth - containerWidth - 10;
  }
  if (top + containerHeight > viewportHeight) {
    top = viewportHeight - containerHeight - 10;
  }

  hoverContainer.style.left = `${left}px`;
  hoverContainer.style.top = `${top}px`;
}

function hideHoverChart() {
  hoverContainer.style.display = 'none';
  if (hoverChartInstance) {
    hoverChartInstance.destroy();
    hoverChartInstance = null;
  }
}

document.querySelectorAll("th.row-label").forEach(th => {
  th.addEventListener("mouseenter", e => toggleLabelState(e, th));
  th.addEventListener("mouseleave", e => toggleLabelState(e, th));
});

function toggleLabelState(e, th) {
  if (e.type === "mouseenter") {
    isOverLabel = true;
    const labelText = th.textContent.trim().toUpperCase();
    const matchedLabel = Object.keys(charts).find(k => labelText === k.toUpperCase());
    if (matchedLabel) {
      const rect = th.getBoundingClientRect();
      showHoverChart(matchedLabel, rect.right, rect.top);
    }
  } else if (e.type === "mouseleave") {
    isOverLabel = false;
    setTimeout(() => {
      if (!isOverLabel && !isOverChart) hideHoverChart();
    }, 100);
  }
}