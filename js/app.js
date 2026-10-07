/**
 * UIB Plataforma de Planeación Presupuestal 2027 - Application Controller
 */

document.addEventListener("DOMContentLoaded", () => {
    // Core State
    let currentView = "dashboard"; // "dashboard", "brokerage", "legal_professional", etc., "consolidated"
    let currentArea = "Agricola";

    // DOM Elements
    const userSelector = document.getElementById("userSelector");
    const areaSelector = document.getElementById("areaSelector");
    const dashTitleArea = document.getElementById("dashTitleArea");
    const badgeRoleAccess = document.getElementById("badgeRoleAccess");

    // Views
    const viewDashboard = document.getElementById("viewDashboard");
    const viewModuleCapture = document.getElementById("viewModuleCapture");
    const viewConsolidated = document.getElementById("viewConsolidated");

    // Module Elements
    const moduleTitleName = document.getElementById("moduleTitleName");
    const moduleTableBody = document.getElementById("moduleTableBody");
    const moduleTableFoot = document.getElementById("moduleTableFoot");

    // Module KPIs
    const kpiModRenovation = document.getElementById("kpiModRenovation");
    const kpiModNewBusiness = document.getElementById("kpiModNewBusiness");
    const kpiModTotalBudget = document.getElementById("kpiModTotalBudget");
    const kpiModVariation = document.getElementById("kpiModVariation");
    const kpiModMonthlyAvg = document.getElementById("kpiModMonthlyAvg");

    // Modals
    const modalRenewalsDetail = new bootstrap.Modal(document.getElementById("modalRenewalsDetail"));
    const modalJustification = new bootstrap.Modal(document.getElementById("modalJustification"));
    const modalJustMonthInput = document.getElementById("modalJustMonth");
    const modalJustTextInput = document.getElementById("modalJustText");
    const modalObsTextInput = document.getElementById("modalObsText");
    const btnSaveJustification = document.getElementById("btnSaveJustification");

    // Action Buttons
    const btnExportExcel = document.getElementById("btnExportExcel");
    const btnExportExcelConsolidated = document.getElementById("btnExportExcelConsolidated");
    const btnSaveDraft = document.getElementById("btnSaveDraft");
    const btnReset = document.getElementById("btnReset");

    // Notifications Toast
    function showToast(msg, type = "primary") {
        const toastEl = document.getElementById("uibToast");
        const toastMsg = document.getElementById("toastMessage");
        if (toastEl && toastMsg) {
            toastMsg.textContent = msg;
            toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val || 0);
    }

    // Initialize Auth & Users Selector
    function initUserSelector() {
        userSelector.innerHTML = "";
        UIB_USERS.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = u.name;
            userSelector.appendChild(opt);
        });

        // Load Saved Local Draft if any
        if (window.planningDataManager.loadFromLocalStorage()) {
            showToast("Se cargó un borrador de presupuesto guardado localmente.", "info");
        }

        userSelector.value = window.authManager.getCurrentUser().id;
        refreshAreaSelector();
    }

    // Refresh Area Selector based on Role/User Permissions
    function refreshAreaSelector() {
        areaSelector.innerHTML = "";
        const allowed = window.authManager.getAvailableAreas();

        // If Admin, also allow "CORPORATIVO" option in Dashboard
        if (window.authManager.isAdmin()) {
            const corpOpt = document.createElement("option");
            corpOpt.value = "CORPORATIVO";
            corpOpt.textContent = "CONSOLIDADO CORPORATIVO";
            areaSelector.appendChild(corpOpt);
        }

        allowed.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            areaSelector.appendChild(opt);
        });

        // Default area
        if (allowed.length > 0) {
            currentArea = allowed[0];
            areaSelector.value = currentArea;
        }

        badgeRoleAccess.textContent = `Acceso: ${window.authManager.getCurrentUser().role}`;
    }

    // Render Navigation & Views
    function switchView(viewName) {
        currentView = viewName;

        // Update nav active classes
        document.querySelectorAll(".uib-nav-link").forEach(link => {
            if (link.getAttribute("data-view") === viewName) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // Hide all views
        viewDashboard.classList.add("d-none");
        viewModuleCapture.classList.add("d-none");
        viewConsolidated.classList.add("d-none");

        if (viewName === "dashboard") {
            viewDashboard.classList.remove("d-none");
            dashTitleArea.textContent = `Dashboard Ejecutivo - ${currentArea}`;
            window.dashboardController.renderDashboard(currentArea, window.planningDataManager);
        } else if (viewName === "consolidated") {
            viewConsolidated.classList.remove("d-none");
            renderConsolidatedView();
        } else {
            viewModuleCapture.classList.remove("d-none");
            const modObj = UIB_MODULES.find(m => m.id === viewName);
            if (modObj) {
                moduleTitleName.textContent = `${modObj.name} - ${currentArea}`;
                renderModuleTable(modObj.id);
            }
        }
    }

    // Render Module Worktable
    function renderModuleTable(moduleId) {
        const area = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;
        const monthsData = window.planningDataManager.budgetData[area]?.[moduleId] || {};

        moduleTableBody.innerHTML = "";

        MONTHS.forEach(month => {
            const entry = monthsData[month] || { renovation: 0, newBusiness: 0, totalBudget: 0, justification: "", observations: "" };
            const tr = document.createElement("tr");

            // Month Label
            const tdMonth = document.createElement("td");
            tdMonth.className = "fw-bold text-dark";
            tdMonth.textContent = month;
            tr.appendChild(tdMonth);

            // Renewal Amount
            const tdRenov = document.createElement("td");
            tdRenov.className = "text-end font-monospace fw-semibold text-secondary";
            tdRenov.textContent = formatCurrency(entry.renovation);
            tr.appendChild(tdRenov);

            // New Business (Editable Input)
            const tdNew = document.createElement("td");
            tdNew.className = "text-end";
            const inputNew = document.createElement("input");
            inputNew.type = "number";
            inputNew.step = "500000";
            inputNew.className = "form-control form-control-sm text-end fw-bold text-success table-input";
            inputNew.value = entry.newBusiness;
            inputNew.addEventListener("input", (e) => {
                window.planningDataManager.updateNewBusiness(area, moduleId, month, e.target.value);
                updateModuleKPIsAndTableFoot(moduleId);
            });
            tdNew.appendChild(inputNew);
            tr.appendChild(tdNew);

            // Total Budget
            const tdTotal = document.createElement("td");
            tdTotal.className = "text-end font-monospace fw-bold text-primary fs-6";
            tdTotal.id = `total_cell_${month}`;
            tdTotal.textContent = formatCurrency(entry.totalBudget);
            tr.appendChild(tdTotal);

            // Traceability / Renewals Detail Button
            const tdTrace = document.createElement("td");
            tdTrace.className = "text-center";
            if (moduleId === 'brokerage') {
                const btnDetail = document.createElement("button");
                btnDetail.className = "btn btn-outline-primary btn-sm px-2 py-0";
                btnDetail.innerHTML = `<i class="bi bi-search me-1"></i>Ver Detalle`;
                btnDetail.addEventListener("click", () => {
                    openRenewalsModal(area, month);
                });
                tdTrace.appendChild(btnDetail);
            } else {
                tdTrace.innerHTML = `<span class="badge bg-light text-muted border">Costo Base</span>`;
            }
            tr.appendChild(tdTrace);

            // Justification Button
            const tdJust = document.createElement("td");
            tdJust.className = "text-center";
            const btnJust = document.createElement("button");
            btnJust.className = `btn btn-sm ${entry.justification ? 'btn-warning' : 'btn-outline-secondary'} px-2 py-0`;
            btnJust.title = entry.justification || "Agregar Observación";
            btnJust.innerHTML = `<i class="bi bi-pencil-square"></i>`;
            btnJust.addEventListener("click", () => {
                openJustificationModal(area, moduleId, month, entry);
            });
            tdJust.appendChild(btnJust);
            tr.appendChild(tdJust);

            moduleTableBody.appendChild(tr);
        });

        updateModuleKPIsAndTableFoot(moduleId);
    }

    function updateModuleKPIsAndTableFoot(moduleId) {
        const area = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;
        const kpis = window.planningDataManager.getModuleKPIs(area, moduleId);

        kpiModRenovation.textContent = formatCurrency(kpis.totalRenovation);
        kpiModNewBusiness.textContent = formatCurrency(kpis.totalNewBusiness);
        kpiModTotalBudget.textContent = formatCurrency(kpis.totalBudget);
        kpiModVariation.textContent = `${formatCurrency(kpis.variationAmount)} (${kpis.variationPct.toFixed(1)}%)`;
        kpiModMonthlyAvg.textContent = formatCurrency(kpis.monthlyAverage);

        // Update table cells for totals
        MONTHS.forEach(m => {
            const totalCell = document.getElementById(`total_cell_${m}`);
            if (totalCell) {
                const entry = window.planningDataManager.budgetData[area]?.[moduleId]?.[m];
                if (entry) totalCell.textContent = formatCurrency(entry.totalBudget);
            }
        });

        // Foot Totals
        moduleTableFoot.innerHTML = `
            <tr>
                <td class="fw-bold text-uppercase">TOTAL ANUAL 2027</td>
                <td class="text-end font-monospace fw-bold fs-6">${formatCurrency(kpis.totalRenovation)}</td>
                <td class="text-end font-monospace fw-bold fs-6 text-success">${formatCurrency(kpis.totalNewBusiness)}</td>
                <td class="text-end font-monospace fw-bold fs-6 text-primary">${formatCurrency(kpis.totalBudget)}</td>
                <td colspan="2" class="text-center text-muted small">Promedio: ${formatCurrency(kpis.monthlyAverage)} / mes</td>
            </tr>
        `;
    }

    // Modal: Ver Detalle Renovaciones
    function openRenewalsModal(area, month) {
        const policies = window.planningDataManager.getMonthlyRenewalPolicies(area, month);
        const tbody = document.getElementById("modalRenewalsTableBody");
        const totalEl = document.getElementById("modalRenewalsTotal");
        document.getElementById("modalRenewalsLabel").textContent = `Detalle de Renovaciones Pólizas - ${month} 2027 (${area})`;

        tbody.innerHTML = "";
        let totalCom = 0;

        policies.forEach(p => {
            totalCom += p.commission;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-dark">${p.client}</td>
                <td>${p.product}</td>
                <td class="text-end font-monospace">${formatCurrency(p.premium)}</td>
                <td class="text-end font-monospace fw-bold text-primary">${formatCurrency(p.commission)}</td>
                <td class="text-center font-monospace small">${p.endDate}</td>
            `;
            tbody.appendChild(tr);
        });

        if (policies.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay pólizas registradas para renovar en este mes.</td></tr>`;
        }

        totalEl.textContent = formatCurrency(totalCom);
        modalRenewalsDetail.show();
    }

    // Modal: Justificaciones
    function openJustificationModal(area, moduleId, month, entry) {
        modalJustMonthInput.value = month;
        modalJustTextInput.value = entry.justification || "";
        modalObsTextInput.value = entry.observations || "";
        modalJustification.show();
    }

    btnSaveJustification.addEventListener("click", () => {
        const month = modalJustMonthInput.value;
        const area = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;
        window.planningDataManager.updateJustification(area, currentView, month, modalJustTextInput.value, modalObsTextInput.value);
        modalJustification.hide();
        renderModuleTable(currentView);
        showToast(`Justificación guardada para ${month}.`, "success");
    });

    // Render Consolidated View
    function renderConsolidatedView() {
        const container = document.getElementById("consolidatedCardsContainer");
        const area = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;

        container.innerHTML = "";

        UIB_MODULES.forEach(mod => {
            const kpis = window.planningDataManager.getModuleKPIs(area, mod.id);
            const col = document.createElement("div");
            col.className = "col-12 col-xl-6";

            col.innerHTML = `
                <div class="pbi-card-table p-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h3 class="h6 font-weight-bold mb-0 text-primary">${mod.name.toUpperCase()}</h3>
                        <span class="badge bg-primary fs-6">${formatCurrency(kpis.totalBudget)}</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm pbi-table">
                            <thead>
                                <tr>
                                    <th>Total Renovación</th>
                                    <th>Total Negocio Nuevo</th>
                                    <th>Presupuesto Total</th>
                                    <th>Variación %</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-monospace">${formatCurrency(kpis.totalRenovation)}</td>
                                    <td class="font-monospace text-success">${formatCurrency(kpis.totalNewBusiness)}</td>
                                    <td class="font-monospace fw-bold text-primary">${formatCurrency(kpis.totalBudget)}</td>
                                    <td class="font-monospace fw-bold">${kpis.variationPct.toFixed(1)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    }

    // Event Handlers
    userSelector.addEventListener("change", (e) => {
        window.authManager.setCurrentUserById(e.target.value);
        refreshAreaSelector();
        switchView(currentView);
        showToast(`Usuario cambiado a ${window.authManager.getCurrentUser().name}.`, "info");
    });

    areaSelector.addEventListener("change", (e) => {
        currentArea = e.target.value;
        switchView(currentView);
    });

    document.querySelectorAll(".uib-nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const viewTarget = link.getAttribute("data-view");
            switchView(viewTarget);
        });
    });

    btnSaveDraft.addEventListener("click", () => {
        window.planningDataManager.saveToLocalStorage();
        showToast("Borrador del presupuesto guardado localmente.", "success");
    });

    btnReset.addEventListener("click", () => {
        if (confirm("¿Desea reiniciar todos los datos presupuestales a los valores iniciales?")) {
            window.planningDataManager.reset();
            switchView(currentView);
            showToast("Presupuesto restablecido.", "warning");
        }
    });

    const triggerExcelExport = async () => {
        const areaToExport = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;
        try {
            showToast(`Generando archivo Excel de 8 hojas para ${areaToExport}...`, "info");
            await window.excelService.exportBudgetToExcel(areaToExport, window.planningDataManager);
            showToast("Archivo Excel descargado exitosamente.", "success");
        } catch (e) {
            console.error("Error exportando a Excel:", e);
            showToast("Error generando el archivo Excel.", "danger");
        }
    };

    btnExportExcel.addEventListener("click", triggerExcelExport);
    btnExportExcelConsolidated.addEventListener("click", triggerExcelExport);

    // Initial Setup
    initUserSelector();
    switchView("dashboard");
});
