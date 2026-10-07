/**
 * UIB Plataforma de Planeación Presupuestal 2027 - ExcelJS Service
 * Exports 8 Sheets according to technical specification
 */

window.excelService = {
    exportBudgetToExcel: async function(area, dataMgr) {
        if (typeof ExcelJS === 'undefined') {
            alert('La librería ExcelJS no se encuentra disponible.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'UIB Corredores de Seguros S.A.';
        workbook.lastModifiedBy = 'Plataforma de Planeación Presupuestal 2027';
        workbook.created = new Date();

        // Corporate Hex Colors
        const PRIMARY_COLOR = 'FF005FAA';    // #005FAA
        const SECONDARY_COLOR = 'FF327FC2';  // #327FC2
        const DARK_COLOR = 'FF23496D';       // #23496D
        const LIGHT_BG = 'FFEBF3FA';         // Light blue
        const TOTAL_BG = 'FFD9E8F5';         // Table totals
        const BORDER_COLOR = 'FFCCCCCC';

        const thinBorder = {
            top: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
        };

        const totalBorder = {
            top: { style: 'thin', color: { argb: DARK_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'double', color: { argb: DARK_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
        };

        // =========================================================
        // HOJA 1: RESUMEN EJECUTIVO
        // =========================================================
        const ws1 = workbook.addWorksheet('Resumen Ejecutivo', { views: [{ showGridLines: true }] });

        ws1.mergeCells('A1:F1');
        const title1 = ws1.getCell('A1');
        title1.value = `UIB CORREDORES DE SEGUROS - PRESUPUESTO COMERCIAL 2027 (${area.toUpperCase()})`;
        title1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
        title1.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(1).height = 35;

        ws1.addRow([]);

        const summary = dataMgr.getAreaDashboardSummary(area);
        ws1.addRow(['INDICADORES CLAVE DE DESEMPEÑO (KPIs)']).font = { bold: true, size: 11, color: { argb: DARK_COLOR } };

        const kpiHeader = ws1.addRow(['Ingreso Brokerage Total', 'Total Renovaciones', 'Total Negocio Nuevo', 'Total Gastos Opera', 'Resultado Neto', '% Cumplimiento']);
        kpiHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        kpiHeader.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const kpiValues = ws1.addRow([
            summary.brokerageRevenue,
            summary.totalRenovations,
            summary.totalNewBusiness,
            summary.totalExpenses,
            summary.netMargin,
            summary.compliancePct / 100
        ]);
        kpiValues.font = { bold: true, size: 11 };
        kpiValues.getCell(1).numFmt = '"$"#,##0';
        kpiValues.getCell(2).numFmt = '"$"#,##0';
        kpiValues.getCell(3).numFmt = '"$"#,##0';
        kpiValues.getCell(4).numFmt = '"$"#,##0';
        kpiValues.getCell(5).numFmt = '"$"#,##0';
        kpiValues.getCell(6).numFmt = '0.0%';
        kpiValues.eachCell(cell => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
            cell.border = thinBorder;
        });

        ws1.addRow([]);
        ws1.addRow(['RESUMEN POR MÓDULO']).font = { bold: true, size: 11, color: { argb: DARK_COLOR } };

        const modHeader = ws1.addRow(['Módulo', 'Total Renovación', 'Total Negocio Nuevo', 'Total Presupuesto', 'Variación ($)', 'Variación (%)']);
        modHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        modHeader.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        UIB_MODULES.forEach(mod => {
            const kpis = dataMgr.getModuleKPIs(area, mod.id);
            const row = ws1.addRow([
                mod.name,
                kpis.totalRenovation,
                kpis.totalNewBusiness,
                kpis.totalBudget,
                kpis.variationAmount,
                kpis.variationPct / 100
            ]);
            row.getCell(1).alignment = { horizontal: 'left' };
            row.getCell(2).numFmt = '"$"#,##0';
            row.getCell(3).numFmt = '"$"#,##0';
            row.getCell(4).numFmt = '"$"#,##0';
            row.getCell(5).numFmt = '"$"#,##0';
            row.getCell(6).numFmt = '0.0%';
            row.eachCell(cell => cell.border = thinBorder);
        });

        ws1.getColumn(1).width = 35;
        ws1.getColumn(2).width = 22;
        ws1.getColumn(3).width = 22;
        ws1.getColumn(4).width = 22;
        ws1.getColumn(5).width = 20;
        ws1.getColumn(6).width = 16;


        // =========================================================
        // HOJAS 2 a 6: DETALLE DE LOS 5 MÓDULOS
        // =========================================================
        UIB_MODULES.forEach(mod => {
            const ws = workbook.addWorksheet(mod.name.substring(0, 31), { views: [{ showGridLines: true }] });

            ws.mergeCells('A1:E1');
            const modTitle = ws.getCell('A1');
            modTitle.value = `${mod.name.toUpperCase()} - DETALLE MENSUAL 2027 (${area.toUpperCase()})`;
            modTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
            modTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
            modTitle.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(1).height = 30;

            const hRow = ws.addRow(['Mes', 'Renovación ($)', 'Negocio Nuevo ($)', 'Total Presupuesto ($)', 'Observaciones']);
            hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            hRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            const monthsData = dataMgr.budgetData[area]?.[mod.id] || {};
            let sumRenov = 0;
            let sumNew = 0;
            let sumTot = 0;

            MONTHS.forEach(m => {
                const entry = monthsData[m] || { renovation: 0, newBusiness: 0, totalBudget: 0, justification: "" };
                sumRenov += entry.renovation;
                sumNew += entry.newBusiness;
                sumTot += entry.totalBudget;

                const r = ws.addRow([
                    m,
                    entry.renovation,
                    entry.newBusiness,
                    entry.totalBudget,
                    entry.justification || entry.observations || ''
                ]);
                r.getCell(1).alignment = { horizontal: 'center' };
                r.getCell(2).numFmt = '"$"#,##0';
                r.getCell(3).numFmt = '"$"#,##0';
                r.getCell(4).numFmt = '"$"#,##0';
                r.getCell(5).alignment = { horizontal: 'left' };
                r.eachCell(cell => cell.border = thinBorder);
            });

            const totRow = ws.addRow(['TOTAL ANUAL', sumRenov, sumNew, sumTot, '']);
            totRow.font = { bold: true };
            totRow.getCell(2).numFmt = '"$"#,##0';
            totRow.getCell(3).numFmt = '"$"#,##0';
            totRow.getCell(4).numFmt = '"$"#,##0';
            totRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
                cell.border = totalBorder;
            });

            ws.getColumn(1).width = 18;
            ws.getColumn(2).width = 22;
            ws.getColumn(3).width = 22;
            ws.getColumn(4).width = 24;
            ws.getColumn(5).width = 45;
        });


        // =========================================================
        // HOJA 7: DETALLE RENOVACIONES
        // =========================================================
        const ws7 = workbook.addWorksheet('Detalle Renovaciones', { views: [{ showGridLines: true }] });

        ws7.mergeCells('A1:G1');
        const title7 = ws7.getCell('A1');
        title7.value = `MAESTRO DE RENOVACIONES DE PÓLIZAS 2027 - ${area.toUpperCase()}`;
        title7.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        title7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
        title7.alignment = { horizontal: 'center', vertical: 'middle' };
        ws7.getRow(1).height = 30;

        const h7 = ws7.addRow(['ID Póliza', 'Asegurado', 'Ramo / Producto', 'Prima Total ($)', 'Comisión UIB ($)', 'Fecha Inicio', 'Fecha Vencimiento (Fin)']);
        h7.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h7.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const renewals = dataMgr.masterRenewals.filter(r => r.area === area);
        renewals.forEach(r => {
            const row = ws7.addRow([
                r.id,
                r.client,
                r.product,
                r.premium,
                r.commission,
                r.startDate,
                r.endDate
            ]);
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(2).alignment = { horizontal: 'left' };
            row.getCell(3).alignment = { horizontal: 'left' };
            row.getCell(4).numFmt = '"$"#,##0';
            row.getCell(5).numFmt = '"$"#,##0';
            row.getCell(6).alignment = { horizontal: 'center' };
            row.getCell(7).alignment = { horizontal: 'center' };
            row.eachCell(cell => cell.border = thinBorder);
        });

        ws7.getColumn(1).width = 16;
        ws7.getColumn(2).width = 30;
        ws7.getColumn(3).width = 32;
        ws7.getColumn(4).width = 22;
        ws7.getColumn(5).width = 22;
        ws7.getColumn(6).width = 16;
        ws7.getColumn(7).width = 22;


        // =========================================================
        // HOJA 8: JUSTIFICACIONES
        // =========================================================
        const ws8 = workbook.addWorksheet('Justificaciones', { views: [{ showGridLines: true }] });

        ws8.mergeCells('A1:E1');
        const title8 = ws8.getCell('A1');
        title8.value = `JUSTIFICACIONES DE NEGOCIO NUEVO Y VARIACIONES - ${area.toUpperCase()}`;
        title8.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        title8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
        title8.alignment = { horizontal: 'center', vertical: 'middle' };
        ws8.getRow(1).height = 30;

        const h8 = ws8.addRow(['Módulo', 'Mes', 'Monto Negocio Nuevo ($)', 'Justificación Estratégica', 'Observaciones']);
        h8.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h8.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        let justCount = 0;
        UIB_MODULES.forEach(mod => {
            MONTHS.forEach(m => {
                const entry = dataMgr.budgetData[area]?.[mod.id]?.[m];
                if (entry && (entry.justification || entry.observations)) {
                    justCount++;
                    const row = ws8.addRow([
                        mod.name,
                        m,
                        entry.newBusiness,
                        entry.justification || '',
                        entry.observations || ''
                    ]);
                    row.getCell(1).alignment = { horizontal: 'left' };
                    row.getCell(2).alignment = { horizontal: 'center' };
                    row.getCell(3).numFmt = '"$"#,##0';
                    row.getCell(4).alignment = { horizontal: 'left', wrapText: true };
                    row.getCell(5).alignment = { horizontal: 'left', wrapText: true };
                    row.eachCell(cell => cell.border = thinBorder);
                }
            });
        });

        if (justCount === 0) {
            const noRow = ws8.addRow(['No hay observaciones ni justificaciones adicionales ingresadas para esta área.']);
            ws8.mergeCells('A3:E3');
            noRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
            noRow.getCell(1).alignment = { horizontal: 'center' };
        }

        ws8.getColumn(1).width = 25;
        ws8.getColumn(2).width = 16;
        ws8.getColumn(3).width = 22;
        ws8.getColumn(4).width = 40;
        ws8.getColumn(5).width = 40;

        // Generate Buffer & Trigger Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Presupuesto_${area.replace(/\s+/g, '_')}_2027.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};
