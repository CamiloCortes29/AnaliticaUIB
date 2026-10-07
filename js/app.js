/**
 * UIB Presupuesto Comercial 2027 - Main Application Controller
 * Connects UI, BudgetDataManager, ExcelService, and Chart.js
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const areaSelector = document.getElementById("areaSelector");
    const globalIncrementInput = document.getElementById("globalIncrementInput");
    const budgetTableBody = document.getElementById("budgetTableBody");
    const budgetTableFoot = document.getElementById("budgetTableFoot");
    const tableAreaHeader = document.getElementById("tableAreaHeader");
    const badgeAreaTotals = document.getElementById("badgeAreaTotals");

    // KPI Elements
    const kpiTotalExecuted2026 = document.getElementById("kpiTotalExecuted2026");
    const kpiTotalBudget2027 = document.getElementById("kpiTotalBudget2027");
    const kpiGrowthAmount = document.getElementById("kpiGrowthAmount");
    const kpiGrowthPct = document.getElementById("kpiGrowthPct");

    // Buttons & File Input
    const btnCalculate = document.getElementById("btnCalculate");
    const btnSaveDraft = document.getElementById("btnSaveDraft");
    const btnReset = document.getElementById("btnReset");
    const btnExportExcel = document.getElementById("btnExportExcel");
    const btnImportExcel = document.getElementById("btnImportExcel");
    const excelFileInput = document.getElementById("excelFileInput");

    // Charts
    let chartMonthly = null;
    let chartArea = null;

    // Toast Notification helper
    function showNotification(msg, type = "primary") {
        const toastEl = document.getElementById("uibToast");
        const toastMsg = document.getElementById("toastMessage");
        if (toastEl && toastMsg) {
            toastMsg.textContent = msg;
            toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }

    // Number Formatters
    function formatCurrency(val) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val || 0);
    }

    function formatPct(val) {
        const num = parseFloat(val) || 0;
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(1)}%`;
    }

    // Initialize UI Selectors
    function initSelectors() {
        areaSelector.innerHTML = "";
        AREAS_LIST.forEach(area => {
            const opt = document.createElement("option");
            opt.value = area;
            opt.textContent = area;
            areaSelector.appendChild(opt);
        });

        // Load draft if available
        const loaded = window.budgetManager.loadFromLocalStorage();
        if (loaded) {
            showNotification("Se ha cargado un borrador guardado anteriormente.", "info");
        }

        areaSelector.value = window.budgetManager.currentArea;
        globalIncrementInput.value = window.budgetManager.globalIncrementPct;
    }

    // Update Dashboard Cards
    function renderDashboardKPIs() {
        const totals = window.budgetManager.getCompanyTotals();

        kpiTotalExecuted2026.textContent = formatCurrency(totals.totalExecuted2026);
        kpiTotalBudget2027.textContent = formatCurrency(totals.totalBudget2027);

        kpiGrowthAmount.textContent = formatCurrency(totals.variationAmount);
        if (totals.variationAmount < 0) {
            kpiGrowthAmount.className = "kpi-value text-danger";
        } else {
            kpiGrowthAmount.className = "kpi-value text-success";
        }

        kpiGrowthPct.textContent = formatPct(totals.variationPct);
        if (totals.variationPct < 0) {
            kpiGrowthPct.className = "kpi-value text-danger";
        } else {
            kpiGrowthPct.className = "kpi-value text-success";
        }
    }

    // Render Main Budget Table for Current Area
    function renderTable() {
        const currentArea = areaSelector.value;
        window.budgetManager.currentArea = currentArea;
        tableAreaHeader.textContent = `Presupuesto - ${currentArea}`;

        const areaData = window.budgetManager.data[currentArea] || {};
        budgetTableBody.innerHTML = "";

        MONTHS_LIST.forEach(month => {
            const mData = areaData[month] || {
                executed2026: 0,
                suggestedIncrementPct: window.budgetManager.globalIncrementPct,
                budget2027: 0,
                variationAmount: 0,
                variationPct: 0,
                justification: ""
            };

            const tr = document.createElement("tr");

            // Month Label
            const tdMonth = document.createElement("td");
            tdMonth.className = "fw-bold text-dark";
            tdMonth.textContent = month;
            tr.appendChild(tdMonth);

            // Executed 2026
            const tdExec = document.createElement("td");
            tdExec.className = "text-end font-monospace fw-semibold text-secondary";
            tdExec.textContent = formatCurrency(mData.executed2026);
            tr.appendChild(tdExec);

            // % Increment Suggested
            const tdIncPct = document.createElement("td");
            tdIncPct.className = "text-center";
            const inputInc = document.createElement("input");
            inputInc.type = "number";
            inputInc.step = "0.5";
            inputInc.className = "form-control form-control-sm text-center table-input";
            inputInc.value = mData.suggestedIncrementPct;
            inputInc.addEventListener("change", (e) => {
                window.budgetManager.updateMonthIncrementPct(currentArea, month, e.target.value);
                updateAllViews();
            });
            tdIncPct.appendChild(inputInc);
            tr.appendChild(tdIncPct);

            // Budget 2027 (Editable Number Input)
            const tdBudget = document.createElement("td");
            tdBudget.className = "text-end";
            const inputBudget = document.createElement("input");
            inputBudget.type = "number";
            inputBudget.step = "100000";
            inputBudget.className = "form-control form-control-sm text-end fw-bold table-input";
            inputBudget.style.color = "var(--uib-primary)";
            inputBudget.value = mData.budget2027;
            inputBudget.addEventListener("input", (e) => {
                window.budgetManager.updateMonthBudget(currentArea, month, e.target.value);
                updateAllViews();
            });
            tdBudget.appendChild(inputBudget);
            tr.appendChild(tdBudget);

            // Variation Amount $
            const tdVarAmt = document.createElement("td");
            tdVarAmt.className = `text-end font-monospace fw-bold ${mData.variationAmount >= 0 ? "text-success" : "text-danger"}`;
            tdVarAmt.textContent = formatCurrency(mData.variationAmount);
            tr.appendChild(tdVarAmt);

            // Variation %
            const tdVarPct = document.createElement("td");
            tdVarPct.className = "text-center";
            const badgeClass = mData.variationPct >= 0 ? "badge-variation-positive" : "badge-variation-negative";
            tdVarPct.innerHTML = `<span class="${badgeClass}">${formatPct(mData.variationPct)}</span>`;
            tr.appendChild(tdVarPct);

            // Justification Text Input
            const tdJust = document.createElement("td");
            const inputJust = document.createElement("input");
            inputJust.type = "text";
            inputJust.className = "form-control form-control-sm table-input";
            inputJust.placeholder = "Añadir justificación...";
            inputJust.value = mData.justification || "";
            inputJust.addEventListener("change", (e) => {
                window.budgetManager.updateMonthJustification(currentArea, month, e.target.value);
            });
            tdJust.appendChild(inputJust);
            tr.appendChild(tdJust);

            budgetTableBody.appendChild(tr);
        });

        // Render Foot Totals for Current Area
        const areaTotals = window.budgetManager.getAreaTotals(currentArea);
        budgetTableFoot.innerHTML = "";
        const footTr = document.createElement("tr");

        footTr.innerHTML = `
            <td class="fw-bold text-uppercase">TOTAL ${currentArea.toUpperCase()}</td>
            <td class="text-end font-monospace fw-bold fs-6">${formatCurrency(areaTotals.totalExecuted2026)}</td>
            <td class="text-center text-muted">-</td>
            <td class="text-end font-monospace fw-bold fs-6" style="color: var(--uib-primary);">${formatCurrency(areaTotals.totalBudget2027)}</td>
            <td class="text-end font-monospace fw-bold fs-6 ${areaTotals.variationAmount >= 0 ? "text-success" : "text-danger"}">${formatCurrency(areaTotals.variationAmount)}</td>
            <td class="text-center"><span class="${areaTotals.variationPct >= 0 ? "badge-variation-positive" : "badge-variation-negative"} fs-6">${formatPct(areaTotals.variationPct)}</span></td>
            <td></td>
        `;
        budgetTableFoot.appendChild(footTr);

        badgeAreaTotals.textContent = `Ejecutado: ${formatCurrency(areaTotals.totalExecuted2026)} | Presupuesto: ${formatCurrency(areaTotals.totalBudget2027)}`;
    }

    // Render Chart.js Analytics
    function renderCharts() {
        const currentArea = areaSelector.value;
        const areaData = window.budgetManager.data[currentArea] || {};

        const executedSeries = MONTHS_LIST.map(m => areaData[m] ? areaData[m].executed2026 : 0);
        const budgetSeries = MONTHS_LIST.map(m => areaData[m] ? areaData[m].budget2027 : 0);

        // 1. Monthly Comparison Chart (Bar)
        const ctxMonthly = document.getElementById("chartMonthlyComparison").getContext("2d");
        document.getElementById("chartMonthlyTitle").textContent = `Comparativo Mensual 2026 vs 2027 - ${currentArea}`;

        if (chartMonthly) chartMonthly.destroy();

        chartMonthly = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: MONTHS_LIST.map(m => m.substring(0, 3)),
                datasets: [
                    {
                        label: 'Ejecutado 2026',
                        data: executedSeries,
                        backgroundColor: '#888880',
                        borderRadius: 4
                    },
                    {
                        label: 'Presupuesto 2027',
                        data: budgetSeries,
                        backgroundColor: '#005FAA',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000000).toFixed(0) + 'M';
                            }
                        }
                    }
                }
            }
        });

        // 2. Area Distribution Chart (Doughnut)
        const areaLabels = AREAS_LIST;
        const areaBudgetTotals = AREAS_LIST.map(a => window.budgetManager.getAreaTotals(a).totalBudget2027);

        const ctxArea = document.getElementById("chartAreaDistribution").getContext("2d");
        if (chartArea) chartArea.destroy();

        chartArea = new Chart(ctxArea, {
            type: 'doughnut',
            data: {
                labels: areaLabels,
                datasets: [{
                    data: areaBudgetTotals,
                    backgroundColor: [
                        '#005FAA', '#327FC2', '#04A0D9', '#23496D',
                        '#84C44C', '#F57E21', '#DE2A2B', '#6C52A2', '#888880'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Refresh all views
    function updateAllViews() {
        renderDashboardKPIs();
        renderTable();
        renderCharts();
    }

    // Event Listeners
    areaSelector.addEventListener("change", () => {
        updateAllViews();
    });

    globalIncrementInput.addEventListener("change", (e) => {
        const pct = e.target.value;
        window.budgetManager.setGlobalIncrement(pct);
        updateAllViews();
        showNotification(`Incremento sugerido actualizado a ${pct}% en todas las áreas.`, "primary");
    });

    btnCalculate.addEventListener("click", () => {
        window.budgetManager.recalculateAll();
        updateAllViews();
        showNotification("Cálculos y variaciones actualizados correctamente.", "success");
    });

    btnSaveDraft.addEventListener("click", () => {
        window.budgetManager.saveToLocalStorage();
        showNotification("Borrador de presupuesto guardado exitosamente.", "success");
    });

    btnReset.addEventListener("click", () => {
        if (confirm("¿Está seguro de reiniciar todos los datos al estado original? Se perderán las modificaciones no guardadas.")) {
            window.budgetManager.reset();
            initSelectors();
            updateAllViews();
            showNotification("El presupuesto ha sido restablecido a los valores iniciales.", "warning");
        }
    });

    btnExportExcel.addEventListener("click", async () => {
        try {
            showNotification("Generando archivo Excel profesional...", "info");
            await window.excelService.exportToExcel(window.budgetManager);
            showNotification("Archivo Excel descargado con éxito.", "success");
        } catch (e) {
            console.error("Error al exportar a Excel:", e);
            showNotification("Ocurrió un error al generar el archivo Excel.", "danger");
        }
    });

    btnImportExcel.addEventListener("click", () => {
        excelFileInput.click();
    });

    excelFileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showNotification("Procesando archivo de ejecución 2026...", "info");
            const count = await window.excelService.importFromExcel(file, window.budgetManager);
            updateAllViews();
            showNotification(`Se cargaron ${count} registros de ejecución exitosamente desde el archivo Excel.`, "success");
        } catch (err) {
            console.error("Error importando Excel:", err);
            showNotification(`Error al procesar el archivo Excel: ${err.message}`, "danger");
        } finally {
            excelFileInput.value = "";
        }
    });

    // Initial Load Execution
    initSelectors();
    updateAllViews();
});
