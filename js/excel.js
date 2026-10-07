/**
 * UIB Presupuesto Comercial 2027 - ExcelJS Service
 * Handles Excel Import and Export with Executive Formatting and Corporate Palette
 */

window.excelService = {
    /**
     * Helper to format numbers as COP Currency
     */
    formatCurrency: function(val) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val || 0);
    },

    /**
     * Export Budget Data to Excel with 3 Professional Sheets
     */
    exportToExcel: async function(budgetMgr) {
        if (typeof ExcelJS === 'undefined') {
            alert('La librería ExcelJS no está cargada. Verifique su conexión a internet.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'UIB Corredores de Seguros';
        workbook.lastModifiedBy = 'Sistema de Presupuesto UIB';
        workbook.created = new Date();

        // Corporate Colors Hex (without # for ExcelJS ARGB)
        const PRIMARY_COLOR = 'FF005FAA';    // #005FAA
        const SECONDARY_COLOR = 'FF327FC2';  // #327FC2
        const DARK_COLOR = 'FF23496D';       // #23496D
        const LIGHT_HEADER = 'FFEBF3FA';     // Light blue header fill
        const TOTAL_FILL = 'FFD9E8F5';       // Total row fill
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

        // ==========================================
        // HOJA 1: RESUMEN EJECUTIVO
        // ==========================================
        const ws1 = workbook.addWorksheet('Resumen Ejecutivo', {
            views: [{ showGridLines: true }]
        });

        // Banner Title
        ws1.mergeCells('A1:F1');
        const titleCell = ws1.getCell('A1');
        titleCell.value = 'UIB CORREDORES DE SEGUROS - PRESUPUESTO COMERCIAL 2027';
        titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(1).height = 35;

        // Subtitle
        ws1.mergeCells('A2:F2');
        const subTitleCell = ws1.getCell('A2');
        subTitleCell.value = `Informe Ejecutivo Consolidado | Generado: ${new Date().toLocaleDateString('es-CO')} | Incremento Base: ${budgetMgr.globalIncrementPct}%`;
        subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
        subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECONDARY_COLOR } };
        subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(2).height = 20;

        ws1.addRow([]); // Blank line

        // Company KPI Summary Cards in Excel
        const companyTotals = budgetMgr.getCompanyTotals();

        ws1.addRow(['KPI KPI GENERAL DE LA COMPAÑÍA']).font = { bold: true, size: 12, color: { argb: DARK_COLOR } };
        ws1.mergeCells('A4:F4');

        const kpiHeaderRow = ws1.addRow(['Total Ejecutado 2026', 'Total Presupuesto 2027', 'Crecimiento ($)', 'Crecimiento (%)']);
        kpiHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        kpiHeaderRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const kpiValueRow = ws1.addRow([
            companyTotals.totalExecuted2026,
            companyTotals.totalBudget2027,
            companyTotals.variationAmount,
            companyTotals.variationPct / 100
        ]);
        kpiValueRow.font = { bold: true, size: 12 };
        kpiValueRow.getCell(1).numFmt = '"$"#,##0';
        kpiValueRow.getCell(2).numFmt = '"$"#,##0';
        kpiValueRow.getCell(3).numFmt = '"$"#,##0';
        kpiValueRow.getCell(4).numFmt = '0.0%';
        kpiValueRow.eachCell(cell => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_HEADER } };
            cell.border = thinBorder;
        });
        kpiValueRow.height = 25;

        ws1.addRow([]); // Blank line

        // Area Summary Table
        const areaHeaderRow = ws1.addRow([
            'Área / Línea de Negocio',
            'Ejecutado 2026',
            'Presupuesto 2027',
            'Variación ($)',
            'Variación (%)',
            '% Participación 2027'
        ]);
        areaHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        areaHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        areaHeaderRow.height = 24;

        AREAS_LIST.forEach(area => {
            const totals = budgetMgr.getAreaTotals(area);
            const partPct = companyTotals.totalBudget2027 > 0 ? totals.totalBudget2027 / companyTotals.totalBudget2027 : 0;
            const row = ws1.addRow([
                area,
                totals.totalExecuted2026,
                totals.totalBudget2027,
                totals.variationAmount,
                totals.variationPct / 100,
                partPct
            ]);
            row.getCell(1).alignment = { horizontal: 'left' };
            row.getCell(2).numFmt = '"$"#,##0';
            row.getCell(3).numFmt = '"$"#,##0';
            row.getCell(4).numFmt = '"$"#,##0';
            row.getCell(5).numFmt = '0.0%';
            row.getCell(6).numFmt = '0.0%';
            row.eachCell(cell => { cell.border = thinBorder; });
        });

        // Total Row
        const summaryTotalRow = ws1.addRow([
            'TOTAL COMPAÑÍA',
            companyTotals.totalExecuted2026,
            companyTotals.totalBudget2027,
            companyTotals.variationAmount,
            companyTotals.variationPct / 100,
            1.0
        ]);
        summaryTotalRow.font = { bold: true };
        summaryTotalRow.getCell(2).numFmt = '"$"#,##0';
        summaryTotalRow.getCell(3).numFmt = '"$"#,##0';
        summaryTotalRow.getCell(4).numFmt = '"$"#,##0';
        summaryTotalRow.getCell(5).numFmt = '0.0%';
        summaryTotalRow.getCell(6).numFmt = '0.0%';
        summaryTotalRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
            cell.border = totalBorder;
        });

        ws1.addRow([]); // Blank line

        // Monthly Company Summary Table
        ws1.addRow(['CONSOLIDADO MENSUAL COMPAÑÍA']).font = { bold: true, size: 12, color: { argb: DARK_COLOR } };
        const monthHeaderRow = ws1.addRow([
            'Mes',
            'Ejecutado 2026',
            'Presupuesto 2027',
            'Variación ($)',
            'Variación (%)'
        ]);
        monthHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        monthHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECONDARY_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const monthlySummary = budgetMgr.getMonthlySummaryAllAreas();
        monthlySummary.forEach(m => {
            const row = ws1.addRow([
                m.month,
                m.executed2026,
                m.budget2027,
                m.variationAmount,
                m.variationPct / 100
            ]);
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(2).numFmt = '"$"#,##0';
            row.getCell(3).numFmt = '"$"#,##0';
            row.getCell(4).numFmt = '"$"#,##0';
            row.getCell(5).numFmt = '0.0%';
            row.eachCell(cell => { cell.border = thinBorder; });
        });

        // Set column widths
        ws1.getColumn(1).width = 25;
        ws1.getColumn(2).width = 22;
        ws1.getColumn(3).width = 22;
        ws1.getColumn(4).width = 22;
        ws1.getColumn(5).width = 16;
        ws1.getColumn(6).width = 20;

        // ==========================================
        // HOJA 2: DETALLE PRESUPUESTO
        // ==========================================
        const ws2 = workbook.addWorksheet('Detalle Presupuesto', {
            views: [{ showGridLines: true }]
        });

        ws2.mergeCells('A1:H1');
        const titleCell2 = ws2.getCell('A1');
        titleCell2.value = 'DETALLE DE PRESUPUESTO Y EJECUCIÓN POR ÁREA Y MES';
        titleCell2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
        titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
        ws2.getRow(1).height = 30;

        const detailHeaderRow = ws2.addRow([
            'Área',
            'Mes',
            'Ejecutado 2026',
            '% Inc. Sugerido',
            'Presupuesto 2027',
            'Variación ($)',
            'Variación (%)',
            'Justificación'
        ]);
        detailHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        detailHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        detailHeaderRow.height = 24;

        AREAS_LIST.forEach(area => {
            MONTHS_LIST.forEach(month => {
                const mData = budgetMgr.data[area][month];
                const row = ws2.addRow([
                    area,
                    month,
                    mData.executed2026,
                    mData.suggestedIncrementPct / 100,
                    mData.budget2027,
                    mData.variationAmount,
                    mData.variationPct / 100,
                    mData.justification || ''
                ]);
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'center' };
                row.getCell(3).numFmt = '"$"#,##0';
                row.getCell(4).numFmt = '0.0%';
                row.getCell(5).numFmt = '"$"#,##0';
                row.getCell(6).numFmt = '"$"#,##0';
                row.getCell(7).numFmt = '0.0%';
                row.getCell(8).alignment = { horizontal: 'left', wrapText: true };
                row.eachCell(cell => { cell.border = thinBorder; });
            });

            // Subtotal row per area
            const totals = budgetMgr.getAreaTotals(area);
            const subRow = ws2.addRow([
                `TOTAL ${area.toUpperCase()}`,
                'Anual',
                totals.totalExecuted2026,
                '',
                totals.totalBudget2027,
                totals.variationAmount,
                totals.variationPct / 100,
                ''
            ]);
            subRow.font = { bold: true };
            subRow.getCell(3).numFmt = '"$"#,##0';
            subRow.getCell(5).numFmt = '"$"#,##0';
            subRow.getCell(6).numFmt = '"$"#,##0';
            subRow.getCell(7).numFmt = '0.0%';
            subRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_HEADER } };
                cell.border = totalBorder;
            });
        });

        // Total General Row
        const granTotalRow = ws2.addRow([
            'GRAN TOTAL COMPAÑÍA',
            'Anual',
            companyTotals.totalExecuted2026,
            '',
            companyTotals.totalBudget2027,
            companyTotals.variationAmount,
            companyTotals.variationPct / 100,
            ''
        ]);
        granTotalRow.font = { bold: true, size: 11 };
        granTotalRow.getCell(3).numFmt = '"$"#,##0';
        granTotalRow.getCell(5).numFmt = '"$"#,##0';
        granTotalRow.getCell(6).numFmt = '"$"#,##0';
        granTotalRow.getCell(7).numFmt = '0.0%';
        granTotalRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
            cell.border = totalBorder;
        });

        ws2.getColumn(1).width = 22;
        ws2.getColumn(2).width = 14;
        ws2.getColumn(3).width = 20;
        ws2.getColumn(4).width = 16;
        ws2.getColumn(5).width = 20;
        ws2.getColumn(6).width = 20;
        ws2.getColumn(7).width = 16;
        ws2.getColumn(8).width = 45;

        // ==========================================
        // HOJA 3: JUSTIFICACIONES
        // ==========================================
        const ws3 = workbook.addWorksheet('Justificaciones', {
            views: [{ showGridLines: true }]
        });

        ws3.mergeCells('A1:F1');
        const titleCell3 = ws3.getCell('A1');
        titleCell3.value = 'REGISTRO Y JUSTIFICACIÓN DE VARIACIONES PRESUPUESTALES';
        titleCell3.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
        titleCell3.alignment = { horizontal: 'center', vertical: 'middle' };
        ws3.getRow(1).height = 30;

        const justHeaderRow = ws3.addRow([
            'Área',
            'Mes',
            'Ejecutado 2026',
            'Presupuesto 2027',
            'Variación ($)',
            'Justificación Registrada'
        ]);
        justHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        justHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_COLOR } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        justHeaderRow.height = 24;

        let justificationsCount = 0;
        AREAS_LIST.forEach(area => {
            MONTHS_LIST.forEach(month => {
                const mData = budgetMgr.data[area][month];
                const comment = (mData.justification || '').trim();
                if (comment.length > 0) {
                    justificationsCount++;
                    const row = ws3.addRow([
                        area,
                        month,
                        mData.executed2026,
                        mData.budget2027,
                        mData.variationAmount,
                        comment
                    ]);
                    row.getCell(1).alignment = { horizontal: 'left' };
                    row.getCell(2).alignment = { horizontal: 'center' };
                    row.getCell(3).numFmt = '"$"#,##0';
                    row.getCell(4).numFmt = '"$"#,##0';
                    row.getCell(5).numFmt = '"$"#,##0';
                    row.getCell(6).alignment = { horizontal: 'left', wrapText: true };
                    row.eachCell(cell => { cell.border = thinBorder; });
                }
            });
        });

        if (justificationsCount === 0) {
            const emptyRow = ws3.addRow(['No se han registrado observaciones ni justificaciones para los rubros.']);
            ws3.mergeCells(`A3:F3`);
            emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
            emptyRow.getCell(1).alignment = { horizontal: 'center' };
        }

        ws3.getColumn(1).width = 22;
        ws3.getColumn(2).width = 14;
        ws3.getColumn(3).width = 20;
        ws3.getColumn(4).width = 20;
        ws3.getColumn(5).width = 20;
        ws3.getColumn(6).width = 60;

        // Generate and download buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UIB_Presupuesto_Comercial_2027_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    /**
     * Import 2026 Execution Data from an uploaded Excel file
     */
    importFromExcel: async function(file, budgetMgr) {
        if (typeof ExcelJS === 'undefined') {
            throw new Error('La librería ExcelJS no está cargada.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error('El archivo Excel no contiene hojas de trabajo válidas.');
        }

        // Parse headers to locate columns
        let headerRowIdx = -1;
        let colMap = {
            area: -1,
            month: -1,
            executed: -1
        };

        worksheet.eachRow((row, rowNumber) => {
            if (headerRowIdx !== -1) return;
            row.eachCell((cell, colNumber) => {
                const val = String(cell.value || '').toLowerCase().trim();
                if (val.includes('área') || val.includes('area') || val.includes('línea') || val.includes('linea')) {
                    colMap.area = colNumber;
                }
                if (val.includes('mes') || val.includes('month') || val.includes('fecha')) {
                    colMap.month = colNumber;
                }
                if (val.includes('ejecutado') || val.includes('2026') || val.includes('valor') || val.includes('monto') || val.includes('vlr')) {
                    colMap.executed = colNumber;
                }
            });
            if (colMap.area !== -1 || colMap.month !== -1 || colMap.executed !== -1) {
                headerRowIdx = rowNumber;
            }
        });

        let loadedRecordsCount = 0;

        // If standard matrix or table layout is detected
        if (colMap.area !== -1 && colMap.month !== -1 && colMap.executed !== -1) {
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= headerRowIdx) return;
                const rawArea = String(row.getCell(colMap.area).value || '').trim();
                const rawMonth = String(row.getCell(colMap.month).value || '').trim();
                const rawExec = parseFloat(row.getCell(colMap.executed).value) || 0;

                const matchedArea = AREAS_LIST.find(a => a.toLowerCase() === rawArea.toLowerCase());
                const matchedMonth = MONTHS_LIST.find(m => m.toLowerCase() === rawMonth.toLowerCase());

                if (matchedArea && matchedMonth) {
                    budgetMgr.data[matchedArea][matchedMonth].executed2026 = rawExec;
                    budgetMgr.recalculateMonth(matchedArea, matchedMonth);
                    loadedRecordsCount++;
                }
            });
        } else {
            // Flexible row-by-row layout scanner
            worksheet.eachRow((row, rowNumber) => {
                let foundArea = null;
                row.eachCell((cell) => {
                    const strVal = String(cell.value || '').trim();
                    const match = AREAS_LIST.find(a => a.toLowerCase() === strVal.toLowerCase());
                    if (match) foundArea = match;
                });

                if (foundArea) {
                    let monthIdx = 0;
                    row.eachCell((cell) => {
                        const cellVal = parseFloat(cell.value);
                        if (!isNaN(cellVal) && cellVal > 1000 && monthIdx < MONTHS_LIST.length) {
                            const monthName = MONTHS_LIST[monthIdx];
                            budgetMgr.data[foundArea][monthName].executed2026 = cellVal;
                            budgetMgr.recalculateMonth(foundArea, monthName);
                            monthIdx++;
                            loadedRecordsCount++;
                        }
                    });
                }
            });
        }

        budgetMgr.recalculateAll();
        return loadedRecordsCount;
    }
};
