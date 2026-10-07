/**
 * UIB Plataforma de Planeación Presupuestal 2027 - ExcelJS Export Service
 * Supports Gerente Area Export (Presupuesto_[AREA]_2027.xlsx)
 * and Administrador Consolidated Export (Presupuesto_Consolidado_2027.xlsx)
 */

window.excelService = {
    PRIMARY_COLOR: 'FF005FAA',
    SECONDARY_COLOR: 'FF327FC2',
    DARK_COLOR: 'FF23496D',
    LIGHT_BG: 'FFEBF3FA',
    TOTAL_BG: 'FFD9E8F5',
    BORDER_COLOR: 'FFCCCCCC',

    getThinBorder: function() {
        return {
            top: { style: 'thin', color: { argb: this.BORDER_COLOR } },
            left: { style: 'thin', color: { argb: this.BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: this.BORDER_COLOR } },
            right: { style: 'thin', color: { argb: this.BORDER_COLOR } }
        };
    },

    getTotalBorder: function() {
        return {
            top: { style: 'thin', color: { argb: this.DARK_COLOR } },
            left: { style: 'thin', color: { argb: this.BORDER_COLOR } },
            bottom: { style: 'double', color: { argb: this.DARK_COLOR } },
            right: { style: 'thin', color: { argb: this.BORDER_COLOR } }
        };
    },

    /**
     * Export Presupuesto_[AREA]_2027.xlsx for Gerente
     */
    exportAreaExcel: async function(area, dataMgr) {
        if (typeof ExcelJS === 'undefined') {
            alert('La librería ExcelJS no se encuentra disponible.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'UIB Corredores de Seguros S.A.';
        workbook.created = new Date();

        const thinBorder = this.getThinBorder();
        const totalBorder = this.getTotalBorder();

        // HOJA 1: RESUMEN EJECUTIVO
        const ws1 = workbook.addWorksheet('Resumen Ejecutivo', { views: [{ showGridLines: true }] });
        ws1.mergeCells('A1:F1');
        const title1 = ws1.getCell('A1');
        title1.value = `UIB CORREDORES DE SEGUROS - PRESUPUESTO COMERCIAL 2027 (${area.toUpperCase()})`;
        title1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
        title1.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(1).height = 35;

        ws1.addRow([]);
        const areaSummary = dataMgr.getAreaSummary(area);

        ws1.addRow(['RESUMEN DE CRITERIOS PRESUPUESTALES']).font = { bold: true, size: 11, color: { argb: this.DARK_COLOR } };
        const h1 = ws1.addRow(['Criterio Presupuestal', 'Renovación / Ejecutado 2026', 'Negocio Nuevo 2027', 'Presupuesto Total 2027', 'Variación $', 'Variación %']);
        h1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h1.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Add Brokerage row
        const brokKpis = dataMgr.getBrokerageKPIs(area);
        const brokRow = ws1.addRow(['Brokerage (Ingreso Comercial)', brokKpis.totalRenovation, brokKpis.totalNewBusiness, brokKpis.totalBrokerage, brokKpis.totalNewBusiness, (brokKpis.totalRenovation > 0 ? brokKpis.totalNewBusiness / brokKpis.totalRenovation : 0)]);
        brokRow.getCell(2).numFmt = '"$"#,##0';
        brokRow.getCell(3).numFmt = '"$"#,##0';
        brokRow.getCell(4).numFmt = '"$"#,##0';
        brokRow.getCell(5).numFmt = '"$"#,##0';
        brokRow.getCell(6).numFmt = '0.0%';
        brokRow.eachCell(c => c.border = thinBorder);

        // Add Expense rows
        ['legal_professional', 'producer_costs', 'training', 'travel'].forEach(mId => {
            const mObj = UIB_MODULES.find(m => m.id === mId);
            const kpis = dataMgr.getExpenseModuleKPIs(area, mId);
            const r = ws1.addRow([mObj.name, kpis.totalExecuted2026, 0, kpis.totalBudget2027, kpis.variationAmount, kpis.variationPct / 100]);
            r.getCell(2).numFmt = '"$"#,##0';
            r.getCell(3).numFmt = '"$"#,##0';
            r.getCell(4).numFmt = '"$"#,##0';
            r.getCell(5).numFmt = '"$"#,##0';
            r.getCell(6).numFmt = '0.0%';
            r.eachCell(c => c.border = thinBorder);
        });

        ws1.getColumn(1).width = 35;
        ws1.getColumn(2).width = 25;
        ws1.getColumn(3).width = 22;
        ws1.getColumn(4).width = 24;
        ws1.getColumn(5).width = 20;
        ws1.getColumn(6).width = 16;


        // HOJA 2: BROKERAGE
        const ws2 = workbook.addWorksheet('Brokerage', { views: [{ showGridLines: true }] });
        ws2.mergeCells('A1:E1');
        const t2 = ws2.getCell('A1');
        t2.value = `BROKERAGE - PRESUPUESTO MENSUAL 2027 (${area.toUpperCase()})`;
        t2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
        t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
        t2.alignment = { horizontal: 'center', vertical: 'middle' };

        const h2 = ws2.addRow(['Mes', 'Renovación 2026 ($)', 'Sugerido 5% ($)', 'Negocio Nuevo 2027 ($)', 'Total Brokerage ($)']);
        h2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h2.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.DARK_COLOR } });

        const brokData = dataMgr.budgetData[area]?.['brokerage'] || {};
        MONTHS.forEach(m => {
            const entry = brokData[m] || { renovation2026: 0, suggested2027: 0, newBusiness2027: 0, totalBrokerage: 0 };
            const r = ws2.addRow([m, entry.renovation2026, entry.suggested2027, entry.newBusiness2027, entry.totalBrokerage]);
            r.getCell(1).alignment = { horizontal: 'center' };
            r.getCell(2).numFmt = '"$"#,##0';
            r.getCell(3).numFmt = '"$"#,##0';
            r.getCell(4).numFmt = '"$"#,##0';
            r.getCell(5).numFmt = '"$"#,##0';
            r.eachCell(c => c.border = thinBorder);
        });

        ws2.getColumn(1).width = 18;
        ws2.getColumn(2).width = 22;
        ws2.getColumn(3).width = 22;
        ws2.getColumn(4).width = 22;
        ws2.getColumn(5).width = 24;


        // HOJAS 3 a 6: GASTOS (Legal, Producer, Training, Travel)
        ['legal_professional', 'producer_costs', 'training', 'travel'].forEach(mId => {
            const mObj = UIB_MODULES.find(m => m.id === mId);
            const ws = workbook.addWorksheet(mObj.name.substring(0, 31), { views: [{ showGridLines: true }] });

            ws.mergeCells('A1:F1');
            const t = ws.getCell('A1');
            t.value = `${mObj.name.toUpperCase()} - PRESUPUESTO 2027 (${area.toUpperCase()})`;
            t.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
            t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
            t.alignment = { horizontal: 'center', vertical: 'middle' };

            const h = ws.addRow(['Mes', 'Valor Ejecutado 2026 ($)', 'Presupuesto 2027 ($)', 'Variación ($)', 'Variación (%)', 'Justificación']);
            h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            h.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.DARK_COLOR } });

            const mData = dataMgr.budgetData[area]?.[mId] || {};
            MONTHS.forEach(m => {
                const entry = mData[m] || { executed2026: 0, budget2027: 0, variationAmount: 0, variationPct: 0, justification: "" };
                const r = ws.addRow([m, entry.executed2026, entry.budget2027, entry.variationAmount, entry.variationPct / 100, entry.justification || '']);
                r.getCell(1).alignment = { horizontal: 'center' };
                r.getCell(2).numFmt = '"$"#,##0';
                r.getCell(3).numFmt = '"$"#,##0';
                r.getCell(4).numFmt = '"$"#,##0';
                r.getCell(5).numFmt = '0.0%';
                r.getCell(6).alignment = { horizontal: 'left' };
                r.eachCell(c => c.border = thinBorder);
            });

            ws.getColumn(1).width = 18;
            ws.getColumn(2).width = 24;
            ws.getColumn(3).width = 24;
            ws.getColumn(4).width = 20;
            ws.getColumn(5).width = 16;
            ws.getColumn(6).width = 40;
        });


        // HOJA 7: DETALLE RENOVACIONES
        const ws7 = workbook.addWorksheet('Detalle Renovaciones', { views: [{ showGridLines: true }] });
        ws7.mergeCells('A1:G1');
        const t7 = ws7.getCell('A1');
        t7.value = `MAESTRO DE RENOVACIONES DE PÓLIZAS 2027 - ${area.toUpperCase()}`;
        t7.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
        t7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
        t7.alignment = { horizontal: 'center', vertical: 'middle' };

        const h7 = ws7.addRow(['ID Póliza', 'Asegurado', 'Producto / Ramo', 'Prima Total ($)', 'Comisión UIB ($)', 'Fecha Inicio', 'Fecha Vencimiento (Fin)']);
        h7.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h7.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.DARK_COLOR } });

        const renewals = dataMgr.masterRenewals.filter(r => r.area === area);
        renewals.forEach(r => {
            const row = ws7.addRow([r.id, r.client, r.product, r.premium, r.commission, r.startDate, r.endDate]);
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(4).numFmt = '"$"#,##0';
            row.getCell(5).numFmt = '"$"#,##0';
            row.eachCell(c => c.border = thinBorder);
        });

        ws7.getColumn(1).width = 16;
        ws7.getColumn(2).width = 30;
        ws7.getColumn(3).width = 32;
        ws7.getColumn(4).width = 22;
        ws7.getColumn(5).width = 22;
        ws7.getColumn(6).width = 16;
        ws7.getColumn(7).width = 22;


        // HOJA 8: JUSTIFICACIONES
        const ws8 = workbook.addWorksheet('Justificaciones', { views: [{ showGridLines: true }] });
        ws8.mergeCells('A1:E1');
        const t8 = ws8.getCell('A1');
        t8.value = `JUSTIFICACIONES PRESUPUESTALES - ${area.toUpperCase()}`;
        t8.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
        t8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
        t8.alignment = { horizontal: 'center', vertical: 'middle' };

        const h8 = ws8.addRow(['Criterio Presupuestal', 'Mes', 'Presupuesto 2027 ($)', 'Variación ($)', 'Justificación']);
        h8.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h8.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.DARK_COLOR } });

        let justCount = 0;
        ['legal_professional', 'producer_costs', 'training', 'travel'].forEach(mId => {
            const mObj = UIB_MODULES.find(m => m.id === mId);
            MONTHS.forEach(m => {
                const entry = dataMgr.budgetData[area]?.[mId]?.[m];
                if (entry && entry.justification) {
                    justCount++;
                    const r = ws8.addRow([mObj.name, m, entry.budget2027, entry.variationAmount, entry.justification]);
                    r.getCell(3).numFmt = '"$"#,##0';
                    r.getCell(4).numFmt = '"$"#,##0';
                    r.eachCell(c => c.border = thinBorder);
                }
            });
        });

        ws8.getColumn(1).width = 25;
        ws8.getColumn(2).width = 16;
        ws8.getColumn(3).width = 22;
        ws8.getColumn(4).width = 22;
        ws8.getColumn(5).width = 50;

        this.triggerDownload(workbook, `Presupuesto_${area.replace(/\s+/g, '_')}_2027.xlsx`);
    },

    /**
     * Export Presupuesto_Consolidado_2027.xlsx for Administrador
     */
    exportConsolidatedExcel: async function(dataMgr) {
        if (typeof ExcelJS === 'undefined') {
            alert('La librería ExcelJS no se encuentra disponible.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'UIB Corredores de Seguros S.A.';
        workbook.created = new Date();

        const thinBorder = this.getThinBorder();
        const totalBorder = this.getTotalBorder();

        // HOJA 1: CONSOLIDADO CORPORATIVO
        const ws1 = workbook.addWorksheet('Consolidado Corporativo', { views: [{ showGridLines: true }] });
        ws1.mergeCells('A1:G1');
        const t1 = ws1.getCell('A1');
        t1.value = 'UIB CORREDORES DE SEGUROS - PRESUPUESTO CONSOLIDADO CORPORATIVO 2027';
        t1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
        t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
        t1.alignment = { horizontal: 'center', vertical: 'middle' };
        ws1.getRow(1).height = 35;

        ws1.addRow([]);
        const corpSummary = dataMgr.getCorporateConsolidatedSummary();

        const h1 = ws1.addRow(['Área / Línea de Negocio', 'Total Brokerage', 'Legal & Professional', 'Producer Costs', 'Training', 'Travel', 'Total General 2027']);
        h1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h1.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.DARK_COLOR } });

        corpSummary.areaSummaries.forEach(s => {
            const r = ws1.addRow([s.area, s.totalBrokerage, s.legalProfessional, s.producerCosts, s.training, s.travel, s.totalGeneral2027]);
            r.getCell(1).alignment = { horizontal: 'left' };
            r.getCell(2).numFmt = '"$"#,##0';
            r.getCell(3).numFmt = '"$"#,##0';
            r.getCell(4).numFmt = '"$"#,##0';
            r.getCell(5).numFmt = '"$"#,##0';
            r.getCell(6).numFmt = '"$"#,##0';
            r.getCell(7).numFmt = '"$"#,##0';
            r.eachCell(c => c.border = thinBorder);
        });

        const totR = ws1.addRow(['TOTAL COMPAÑÍA', corpSummary.totalBrokerage, corpSummary.totalLegal, corpSummary.totalProducer, corpSummary.totalTraining, corpSummary.totalTravel, corpSummary.totalGeneral2027]);
        totR.font = { bold: true };
        totR.getCell(2).numFmt = '"$"#,##0';
        totR.getCell(3).numFmt = '"$"#,##0';
        totR.getCell(4).numFmt = '"$"#,##0';
        totR.getCell(5).numFmt = '"$"#,##0';
        totR.getCell(6).numFmt = '"$"#,##0';
        totR.getCell(7).numFmt = '"$"#,##0';
        totR.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.TOTAL_BG } };
            c.border = totalBorder;
        });

        ws1.getColumn(1).width = 25;
        ws1.getColumn(2).width = 22;
        ws1.getColumn(3).width = 22;
        ws1.getColumn(4).width = 22;
        ws1.getColumn(5).width = 18;
        ws1.getColumn(6).width = 18;
        ws1.getColumn(7).width = 25;

        // HOJAS POR CADA ÁREA (9 Hojas)
        UIB_AREAS.forEach(area => {
            const wsArea = workbook.addWorksheet(area.substring(0, 31), { views: [{ showGridLines: true }] });
            wsArea.mergeCells('A1:F1');
            const tArea = wsArea.getCell('A1');
            tArea.value = `PRESUPUESTO 2027 - ÁREA ${area.toUpperCase()}`;
            tArea.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            tArea.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.PRIMARY_COLOR } };
            tArea.alignment = { horizontal: 'center', vertical: 'middle' };

            const hA = wsArea.addRow(['Criterio Presupuestal', 'Renovación / Ejecutado 2026', 'Negocio Nuevo 2027', 'Presupuesto Total 2027', 'Variación $', 'Variación %']);
            hA.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            hA.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.DARK_COLOR } });

            const brokKpis = dataMgr.getBrokerageKPIs(area);
            const rBrok = wsArea.addRow(['Brokerage', brokKpis.totalRenovation, brokKpis.totalNewBusiness, brokKpis.totalBrokerage, brokKpis.totalNewBusiness, (brokKpis.totalRenovation > 0 ? brokKpis.totalNewBusiness / brokKpis.totalRenovation : 0)]);
            rBrok.getCell(2).numFmt = '"$"#,##0';
            rBrok.getCell(3).numFmt = '"$"#,##0';
            rBrok.getCell(4).numFmt = '"$"#,##0';
            rBrok.getCell(5).numFmt = '"$"#,##0';
            rBrok.getCell(6).numFmt = '0.0%';
            rBrok.eachCell(c => c.border = thinBorder);

            ['legal_professional', 'producer_costs', 'training', 'travel'].forEach(mId => {
                const mObj = UIB_MODULES.find(m => m.id === mId);
                const kpis = dataMgr.getExpenseModuleKPIs(area, mId);
                const r = wsArea.addRow([mObj.name, kpis.totalExecuted2026, 0, kpis.totalBudget2027, kpis.variationAmount, kpis.variationPct / 100]);
                r.getCell(2).numFmt = '"$"#,##0';
                r.getCell(3).numFmt = '"$"#,##0';
                r.getCell(4).numFmt = '"$"#,##0';
                r.getCell(5).numFmt = '"$"#,##0';
                r.getCell(6).numFmt = '0.0%';
                r.eachCell(c => c.border = thinBorder);
            });

            wsArea.getColumn(1).width = 30;
            wsArea.getColumn(2).width = 24;
            wsArea.getColumn(3).width = 22;
            wsArea.getColumn(4).width = 24;
            wsArea.getColumn(5).width = 20;
            wsArea.getColumn(6).width = 16;
        });

        this.triggerDownload(workbook, 'Presupuesto_Consolidado_2027.xlsx');
    },

    triggerDownload: async function(workbook, filename) {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};
