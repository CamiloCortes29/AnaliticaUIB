import pandas as pd
import os
import numpy as np

def procesar_balance(filepath):
    print(f"Iniciando procesamiento de: {filepath}")

    # 1. Identificar y leer hojas necesarias (con fallbacks)
    try:
        xl = pd.ExcelFile(filepath)
        sheet_names = xl.sheet_names
    except Exception as e:
        print(f"Error al abrir el archivo: {e}")
        return

    pg_name = next((s for s in sheet_names if s.upper() == "PG"), "PG")
    londre_name = next((s for s in sheet_names if "LONDRE" in s.upper()), "Inf.Londres")
    ccosto_name = next((s for s in sheet_names if "COSTO" in s.upper()), "Centro de Costo")
    func_name = next((s for s in sheet_names if "FUNC" in s.upper()), "Funcionarios")
    cat_name = next((s for s in sheet_names if "CATALINA" in s.upper()), "Catalina Valencia")

    try:
        df_principal = pd.read_excel(filepath, sheet_name=pg_name)
        print(f"Hoja '{pg_name}' leída correctamente.")
    except Exception as e:
        print(f"Error crítico al leer '{pg_name}': {e}")
        return

    try:
        df_londre = pd.read_excel(filepath, sheet_name=londre_name)
    except Exception as e:
        print(f"Error al leer '{londre_name}': {e}")
        return

    try:
        df_ccosto = pd.read_excel(filepath, sheet_name=ccosto_name)
    except Exception as e:
        print(f"Error al leer '{ccosto_name}': {e}")
        df_ccosto = None

    # --- PARTE 1: Filtrado y VLOOKUP Inicial ---
    col_filtro_origen = "Tipo Origen (Documento)"
    if col_filtro_origen in df_principal.columns:
        df_principal = df_principal.dropna(subset=[col_filtro_origen]).copy()

    # Mapeo para "inf. londre"
    # Buscamos en Inf.Londre la columna A (Cuenta contable) y traemos la B (Nombre o descripción)
    col_busqueda_ref = next((c for c in df_londre.columns if "CUENTA" in c.upper()), df_londre.columns[0])
    col_resultado_ref = next((c for c in df_londre.columns if "NOMBRE" in c.upper() or "DESCRIP" in c.upper()), df_londre.columns[1] if len(df_londre.columns)>1 else df_londre.columns[0])

    # En la principal comparamos con "Cuenta contable" o "nombre cuenta"
    col_busqueda_principal = next((c for c in df_principal.columns if "NOMBRE CUENTA" in c.upper() or "CUENTA CONTABLE" in c.upper()), "Cuenta contable")

    mapeo_londre = df_londre.set_index(col_busqueda_ref)[col_resultado_ref].to_dict()
    df_principal["inf. londre"] = df_principal[col_busqueda_principal].map(mapeo_londre)
    # Alias para lógica interna
    df_principal["inf. londres"] = df_principal["inf. londre"]

    # --- PARTE 2: Cálculos y Áreas ---
    col_debito = "Débito Moneda Local"
    col_credito = "Crédito Moneda Local"
    col_saldo = "Saldo Final (Moneda Local)"
    if col_debito in df_principal.columns and col_credito in df_principal.columns:
        df_principal[col_debito] = pd.to_numeric(df_principal[col_debito], errors='coerce').fillna(0)
        df_principal[col_credito] = pd.to_numeric(df_principal[col_credito], errors='coerce').fillna(0)
        df_principal[col_saldo] = df_principal[col_debito] - df_principal[col_credito]

    col_area = "AREA"
    if col_area in df_principal.columns:
        df_principal["Area_2"] = df_principal[col_area].astype(str).str.replace(".0", "", regex=False).str.strip().str[:2]

    if df_ccosto is not None:
        # Copia para no alterar el original demasiado pronto si hay múltiples usos
        df_cc_cols = [str(c).upper().strip() for c in df_ccosto.columns]
        col_ref_cc_id = next((df_ccosto.columns[i] for i, c in enumerate(df_cc_cols) if "AREA 2" in c), df_ccosto.columns[1] if len(df_ccosto.columns)>1 else None)
        col_ref_cc_nombre = next((df_ccosto.columns[i] for i, c in enumerate(df_cc_cols) if "AREA INFORME" in c), df_ccosto.columns[2] if len(df_ccosto.columns)>2 else None)
        if col_ref_cc_id and col_ref_cc_nombre:
            # Limpiar claves de mapeo (quitar .0)
            df_ccosto[col_ref_cc_id] = df_ccosto[col_ref_cc_id].astype(str).str.replace(".0", "", regex=False).str.strip()
            mapeo_ccosto = df_ccosto.dropna(subset=[col_ref_cc_id]).set_index(col_ref_cc_id)[col_ref_cc_nombre].to_dict()
            # Limpiar claves del dict final
            mapeo_ccosto = {str(k).replace(".0", ""): str(v).replace(".0", "") for k, v in mapeo_ccosto.items() if str(k) != "nan"}
            df_principal["Area_Informe"] = df_principal["Area_2"].map(mapeo_ccosto)

    # --- NORMALIZACIÓN DE FECHA ---
    meses_map = {'01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
                 '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'}
    posibles_nombres_fecha = ["Fecha contabilización", "Fecha Contabilización", "Fecha contabilizacion", "Fecha Contabilizacion"]
    col_fecha = next((c for c in posibles_nombres_fecha if c in df_principal.columns), None)
    if col_fecha:
        df_principal[col_fecha] = pd.to_datetime(df_principal[col_fecha], dayfirst=True, errors='coerce')
        df_principal["Mes Contabilización"] = df_principal[col_fecha].dt.strftime('%Y-%m')

    # --- ACTUALIZAR CATALINA VALENCIA ---
    df_catalina = None
    try:
        df_catalina = pd.read_excel(filepath, sheet_name=cat_name, header=None)
        num_rows_cat = len(df_catalina)
        df_est_tmp = df_principal[(df_principal["inf. londres"].astype(str).str.strip().str.upper() == "COMMISSION PAID") &
                                  (df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "ESTRATEGIAS REA S.A.S.")]
        if not df_est_tmp.empty:
            pivot_estrategias = pd.pivot_table(df_est_tmp, values=col_saldo, index=["Area_2", "Area_Informe"], columns=["Mes Contabilización"], aggfunc="sum", fill_value=0)
            pivot_data = pivot_estrategias.reset_index()
            header_row = df_catalina.iloc[16]
            for col_mes_p in [c for c in pivot_data.columns if c not in ["Area_2", "Area_Informe"]]:
                mes_num = col_mes_p.split('-')[1]; nombre_mes_target = meses_map.get(mes_num)
                col_mes_idx = header_row[header_row == nombre_mes_target].index[0] if nombre_mes_target in header_row.values else None
                if col_mes_idx is not None:
                    for i in range(17, 29):
                        if i >= num_rows_cat: break
                        area_num_val = str(df_catalina.iloc[i, 0]).strip()
                        if not area_num_val or area_num_val == "nan": continue
                        match = pivot_data[pivot_data["Area_2"].astype(str).str.strip() == area_num_val]
                        df_catalina.iloc[i, col_mes_idx] = match[col_mes_p].values[0] if not match.empty else 0
                    if 29 < num_rows_cat:
                        total_col = pd.to_numeric(df_catalina.iloc[17:29, col_mes_idx], errors='coerce').fillna(0).sum()
                        df_catalina.iloc[29, col_mes_idx] = total_col
                        for j in range(34, 47):
                            if j >= num_rows_cat: break
                            area_perc_val = str(df_catalina.iloc[j, 0]).strip()
                            if not area_perc_val or area_perc_val == "nan": continue
                            val_area = 0
                            for r_search in range(17, 29):
                                if r_search >= num_rows_cat: break
                                if str(df_catalina.iloc[r_search, 0]).strip() == area_perc_val:
                                    val_area = df_catalina.iloc[r_search, col_mes_idx]; break
                            df_catalina.iloc[j, col_mes_idx] = (val_area / total_col) if total_col != 0 else 0
                    if 2 < num_rows_cat:
                        val_base_linea_3 = pd.to_numeric(df_catalina.iloc[2, col_mes_idx], errors='coerce') or 0
                        for k in range(52, 65):
                            if k >= num_rows_cat: break
                            area_dist_val = str(df_catalina.iloc[k, 0]).strip()
                            if not area_dist_val or area_dist_val == "nan": continue
                            perc_area = 0
                            for r_perc in range(34, 47):
                                if r_perc >= num_rows_cat: break
                                if str(df_catalina.iloc[r_perc, 0]).strip() == area_dist_val:
                                    perc_area = df_catalina.iloc[r_perc, col_mes_idx]; break
                            df_catalina.iloc[k, col_mes_idx] = perc_area * val_base_linea_3
                    if num_rows_cat > 12:
                        suma_rango_4_13 = pd.to_numeric(df_catalina.iloc[3:13, col_mes_idx], errors='coerce').fillna(0).sum()
                        for l in range(68, 81):
                            if l >= num_rows_cat: break
                            area_range_val = str(df_catalina.iloc[l, 0]).strip()
                            if not area_range_val or area_range_val == "nan": continue
                            perc_area_r = 0
                            for r_perc_r in range(34, 47):
                                if r_perc_r >= num_rows_cat: break
                                if str(df_catalina.iloc[r_perc_r, 0]).strip() == area_range_val:
                                    perc_area_r = df_catalina.iloc[r_perc_r, col_mes_idx]; break
                            df_catalina.iloc[l, col_mes_idx] = perc_area_r * suma_rango_4_13
            print("Hoja 'Catalina Valencia' actualizada.")
    except Exception as e:
        print(f"Error al actualizar 'Catalina Valencia': {e}")

    # --- AJUSTES CONTABLES Y CONSOLIDACIÓN ---
    try:
        header_row_cat = df_catalina.iloc[16] if df_catalina is not None else None
        nuevos_registros = []
        if "Nombre SN" in df_principal.columns:
            # 1. Ajustes Catalina
            df_cat_source = df_principal[df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "CATALINA VALENCIA GOMEZ"].copy()
            if not df_cat_source.empty:
                def get_dist(range_rows):
                    info = []
                    if df_catalina is None: return info
                    for r in range_rows:
                        if r >= len(df_catalina): break
                        a = str(df_catalina.iloc[r, 0]).strip()
                        if not a or a == "nan": continue
                        dm = {}
                        for m in meses_map.values():
                            if m in header_row_cat.values: dm[m] = df_catalina.iloc[r, header_row_cat[header_row_cat == m].index[0]]
                        info.append({"area": a, "dist": dm})
                    return info
                d_sal = get_dist(range(52, 68)); d_oth = get_dist(range(68, 80))
                for _, row in df_cat_source.iterrows():
                    mes_esp_f = meses_map.get(row["Mes Contabilización"].split('-')[1]) if "Mes Contabilización" in row else None
                    inf_l = str(row["inf. londre"]).strip().upper()
                    t_dist = d_sal if "SALARIES" in inf_l else d_oth if "OTHER STAFF COSTS" in inf_l else []
                    v_d = pd.to_numeric(row[col_debito], errors='coerce') or 0; v_c = pd.to_numeric(row[col_credito], errors='coerce') or 0
                    r_rev = row.copy(); r_rev[col_debito], r_rev[col_credito] = v_c, v_d; r_rev[col_saldo] = r_rev[col_debito] - r_rev[col_credito]
                    a_rev = str(r_rev["AREA"]).strip(); r_rev["Area_Informe"] = a_rev[:3] if len(a_rev) >= 4 else a_rev
                    nuevos_registros.append(r_rev)
                    if v_d > 0 and t_dist:
                        for item in t_dist:
                            n_r = row.copy(); n_r["AREA"] = item["area"]; n_r[col_debito] = pd.to_numeric(item["dist"].get(mes_esp_f, 0), errors='coerce') or 0
                            n_r[col_credito] = 0; n_r[col_saldo] = n_r[col_debito] - n_r[col_credito]
                            a_n_r = str(n_r["AREA"]).strip(); n_r["Area_Informe"] = a_n_r[:3] if len(a_n_r) >= 4 else a_n_r
                            nuevos_registros.append(n_r)
            # 2. Ajuste Brokerage S
            df_seg_source = df_principal[(df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "UIB CORREDORES DE SEGUROS S.A.") &
                                         (df_principal["inf. londre"].astype(str).str.strip().str.upper() == "COMMISSION PAID")].copy()
            for _, row in df_seg_source.iterrows():
                r_b = row.copy(); r_b[col_credito] = pd.to_numeric(row[col_debito], errors='coerce') or 0; r_b[col_debito] = 0
                r_b["inf. londre"] = "BROKERAGE S"; r_b[col_saldo] = r_b[col_debito] - r_b[col_credito]; nuevos_registros.append(r_b)

        if nuevos_registros:
            df_principal = pd.concat([df_principal, pd.DataFrame(nuevos_registros)], ignore_index=True)
            print(f"Ajustes consolidados: {len(nuevos_registros)} filas añadidas.")
    except Exception as e:
        print(f"Error en fase de ajustes: {e}")

    # --- AJUSTE MEDELLIN (100 -> 70) ---
    try:
        if "Nombre proyecto" in df_principal.columns and "Area_Informe" in df_principal.columns:
            df_principal["Area_Informe"] = df_principal["Area_Informe"].astype(str).str.replace(".0", "", regex=False).str.strip()
            mask_medellin = (df_principal["Nombre proyecto"].astype(str).str.strip().str.upper() == "MEDELLIN") & (df_principal["Area_Informe"].astype(str).isin(["100", "10"]))
            df_principal.loc[mask_medellin, "Area_Informe"] = "70"
    except Exception as e:
        print(f"Error en ajuste Medellín: {e}")

    # --- TABLAS DINÁMICAS INICIALES ---
    pivots_finales = {}
    try:
        df_principal["Area_Informe"] = df_principal["Area_Informe"].replace("nan", "Desconocido")
        df_est_f = df_principal[(df_principal["inf. londre"].astype(str).str.strip().str.upper() == "COMMISSION PAID") & (df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "ESTRATEGIAS REA S.A.S.")]
        if not df_est_f.empty: pivots_finales["TD Estrategias"] = pd.pivot_table(df_est_f, values=col_saldo, index=["Area_Informe"], columns=["Mes Contabilización"], aggfunc="sum", fill_value=0)
        df_seg_f = df_principal[(df_principal["inf. londre"].astype(str).str.strip().str.upper() == "COMMISSION PAID") & (df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "UIB CORREDORES DE SEGUROS S.A.")]
        if not df_seg_f.empty: pivots_finales["TD SEGUROS"] = pd.pivot_table(df_seg_f, values=col_saldo, index=["Area_Informe"], columns=["Mes Contabilización"], aggfunc="sum", fill_value=0)
        pivot_mov_orig = pd.pivot_table(df_principal, values=col_saldo, index=["inf. londre"], columns=["Area_Informe"], aggfunc="sum", fill_value=0)
        pivot_mov_orig = pivot_mov_orig.reindex(sorted(pivot_mov_orig.columns), axis=1)
        total_mov = pivot_mov_orig.sum().to_frame().T; total_mov.index = ["Total"]; pivot_mov = pd.concat([pivot_mov_orig, total_mov])
        pivots_finales["TD Movimiento 2026"] = pivot_mov
    except Exception as e:
        print(f"Error en tablas dinámicas finales: {e}")

    # --- FUNCIONARIOS ---
    df_funcionarios = None
    perc_func_map = {}
    try:
        df_funcionarios = pd.read_excel(filepath, sheet_name=func_name)
        for col_idx in [10, 11, 12]:
            while len(df_funcionarios.columns) <= col_idx: df_funcionarios[f"Col_{len(df_funcionarios.columns)}"] = None
            df_funcionarios[df_funcionarios.columns[col_idx]] = df_funcionarios[df_funcionarios.columns[col_idx]].astype(object)
        target_col_f = df_funcionarios.columns[3]
        conteos = df_funcionarios[target_col_f].dropna().astype(str).str.strip().value_counts().reset_index()
        conteos.columns = ["AREA INFORME", "No. funcionarios"]; total_f = conteos["No. funcionarios"].sum()
        df_funcionarios.iloc[0, 10], df_funcionarios.iloc[0, 11], df_funcionarios.iloc[0, 12] = "AREA INFORME", "No. funcionarios", "% participación"
        for i, r_c in conteos.iterrows():
            if (i+1) < len(df_funcionarios):
                df_funcionarios.iloc[i+1, 10], df_funcionarios.iloc[i+1, 11], df_funcionarios.iloc[i+1, 12] = r_c["AREA INFORME"], r_c["No. funcionarios"], (r_c["No. funcionarios"]/total_f)
                perc_func_map[str(r_c["AREA INFORME"]).replace(".0", "")] = r_c["No. funcionarios"]/total_f
        idx_t = len(conteos)+1
        if idx_t < len(df_funcionarios): df_funcionarios.iloc[idx_t, 10], df_funcionarios.iloc[idx_t, 11], df_funcionarios.iloc[idx_t, 12] = "Total", total_f, 1.0
        print("Hoja 'Funcionarios' procesada.")
    except Exception as e:
        print(f"Error en Funcionarios: {e}")

    # --- PARTE 12: CÁLCULOS AVANZADOS (Sección Directos en TD Movimiento) ---
    try:
        cols_target = ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "31", "70", "90", "100"]
        indices_target = ["INFORMATION TECHNOLOGY", "OCCUPANCY", "PRINTING, POSTAGE, STATIONERY, TELEPHONES"]
        df_directos = pd.DataFrame(index=indices_target, columns=cols_target)
        for concepto in indices_target:
            val_base_100 = pivot_mov_orig.loc[concepto, "100"] if (concepto in pivot_mov_orig.index and "100" in pivot_mov_orig.columns) else (pivot_mov_orig.loc[concepto, "10"] if (concepto in pivot_mov_orig.index and "10" in pivot_mov_orig.columns) else 0)
            for area in cols_target: df_directos.loc[concepto, area] = val_base_100 * perc_func_map.get(str(area), 0)
        hoja_mov_rows = []
        pivot_mov_sheet = pivots_finales["TD Movimiento 2026"].reset_index()
        hoja_mov_rows.extend(pivot_mov_sheet.values.tolist())
        while len(hoja_mov_rows) < 30: hoja_mov_rows.append([None] * len(pivot_mov_sheet.columns))
        header_31 = ["Directos"] + cols_target + [None, "TOTAL GENERAL"]; hoja_mov_rows.append(header_31)
        for concepto in indices_target:
            vals_c = df_directos.loc[concepto].tolist(); row_c = [concepto] + vals_c + [None, sum(vals_c)]; hoja_mov_rows.append(row_c)
        total_3_lineas = ["TOTAL"] + df_directos.sum().tolist() + [None, df_directos.sum().sum()]; hoja_mov_rows.append(total_3_lineas)
        perc_row_36 = ["%"] + [perc_func_map.get(str(area), 0) for area in cols_target] + [None, 1.0]; hoja_mov_rows.append(perc_row_36)
        pivots_finales["TD Movimiento 2026"] = pd.DataFrame(hoja_mov_rows)
    except Exception as e:
        print(f"Error en Parte 12: {e}")

    # --- BASE_DATA_POWERBI (TABULAR) ---
    df_powerbi = None
    try:
        # Mapeo de Nombres de Área desde Centro de Costo (Col G y H)
        mapeo_nombres_area = {}
        if df_ccosto is not None:
            df_cc_cols = [str(c).upper().strip() for c in df_ccosto.columns]
            # Usamos índices si los nombres de columna varían: Col G es index 6, Col H es index 7
            try:
                # Intentar por nombres si existen
                col_g = next((df_ccosto.columns[i] for i, c in enumerate(df_cc_cols) if "COD" in c and "AREA" in c), None)
                col_h = next((df_ccosto.columns[i] for i, c in enumerate(df_cc_cols) if "NOM" in c and "AREA" in c), None)

                if col_g and col_h:
                    mapeo_nombres_area = df_ccosto.dropna(subset=[col_g]).set_index(df_ccosto.dropna(subset=[col_g])[col_g].astype(str).str.strip())[col_h].to_dict()
                else:
                    # Fallback a posición (G=6, H=7)
                    mapeo_nombres_area = df_ccosto.dropna(subset=[df_ccosto.columns[6]]).set_index(df_ccosto.dropna(subset=[df_ccosto.columns[6]]).iloc[:, 6].astype(str).str.strip()).iloc[:, 7].to_dict()

                # Limpiar claves de mapeo (quitar .0 de floats si existen)
                mapeo_nombres_area = {str(k).replace(".0", ""): v for k, v in mapeo_nombres_area.items() if str(k) != "nan"}
            except Exception as e:
                print(f"Aviso: No se pudo mapear nombres de área desde Centro de Costo: {e}")

        # Listas de clasificación según requerimiento (escalado / 1000)
        lista_ingresos = ["BROKERAGE", "BROKERAGE M", "BROKERAGE S", "FEES", "COMMISSION PAID"]
        lista_staff = ["SALARIES", "BONUS", "OTHER STAFF COSTS"]
        lista_expenses = ["TRAVEL & ENTERTAINING", "OCCUPANCY", "PRINTING, POSTAGE, STATIONERY, TELEPHONES",
                          "INFORMATION TECHNOLOGY", "BAD DEBTS", "LEGAL & PROFESSIONAL", "INSURANCE",
                          "TRAINING/SEMINARS/CONFERENCES", "DEPRECIATION", "BANK CHARGES",
                          "MARKETING, PR & SPONSORSHIP", "OTHER DIRECT COSTS", "INTERCOMPANY"]

        tabular_data = []

        # 1. Registros Directos (Cualquier área que NO sea 100)
        df_direct_pbi = df_principal[df_principal["Area_Informe"].astype(str) != "100"].copy()
        for _, row in df_direct_pbi.iterrows():
            inf_l = str(row["inf. londre"]).strip().upper()

            # Determinar Sección
            if any(x in inf_l for x in lista_ingresos):
                seccion = "Brokerage & Fees"
            elif any(x in inf_l for x in lista_staff + lista_expenses):
                seccion = "Direct Costs"
            else:
                seccion = "Otros"

            area_cod = str(row["Area_Informe"]).strip()
            tabular_data.append({
                "Mes": row["Mes Contabilización"] if "Mes Contabilización" in row else None,
                "Area": area_cod,
                "Nombre Area": mapeo_nombres_area.get(area_cod, "Desconocido"),
                "Seccion": seccion,
                "Concepto": inf_l,
                "Valor": (row[col_saldo] / 1000)
            })

        # 2. Registros Indirectos (Redistribución del Area 100)
        df_indirect_pbi = df_principal[df_principal["Area_Informe"].astype(str) == "100"].copy()
        for _, row in df_indirect_pbi.iterrows():
            inf_l = str(row["inf. londre"]).strip().upper()
            valor_original = row[col_saldo]
            mes_orig = row["Mes Contabilización"] if "Mes Contabilización" in row else None

            # Distribuir este valor por todas las áreas operativas según Funcionarios
            for area_dest, perc in perc_func_map.items():
                if str(area_dest) == "100": continue
                area_dest_s = str(area_dest).strip()
                tabular_data.append({
                    "Mes": mes_orig,
                    "Area": area_dest_s,
                    "Nombre Area": mapeo_nombres_area.get(area_dest_s, "Desconocido"),
                    "Seccion": "Indirect Costs",
                    "Concepto": inf_l,
                    "Valor": (valor_original * perc) / 1000
                })

        df_powerbi = pd.DataFrame(tabular_data)
        # Limpieza de nombres de concepto para que coincidan con la lista exacta
        # Ordenamos por longitud descendente para evitar reemplazos parciales incorrectos
        todas_las_keys = sorted(lista_ingresos + lista_staff + lista_expenses, key=len, reverse=True)
        for c in todas_las_keys:
            mask = df_powerbi["Concepto"].str.upper().str.contains(c, na=False)
            df_powerbi.loc[mask, "Concepto"] = c.title()

        print("Hoja 'BASE_DATA_POWERBI' generada (valores / 1000).")
    except Exception as e:
        print(f"Error al generar base Power BI: {e}")

    # Guardar
    try:
        df_final = df_principal.copy()
        if col_fecha:
            df_final[col_fecha] = pd.to_datetime(df_final[col_fecha], dayfirst=True).dt.date

        with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            # Limpieza final de Procesado
            cols_drop = list(meses_map.values()) + ["Area_2", "inf. londres"]
            df_out = df_final.copy()
            for c in cols_drop:
                if c in df_out.columns: df_out = df_out.drop(columns=[c])

            # Agregar Nombre de Area a Procesado también si es posible
            if "Area_Informe" in df_out.columns:
                df_out["Nombre Area"] = df_out["Area_Informe"].astype(str).str.replace(".0", "", regex=False).str.strip().map(mapeo_nombres_area)

            df_out.to_excel(writer, sheet_name="Procesado", index=False)

            for name, p_df in pivots_finales.items():
                if name == "TD Movimiento 2026": p_df.to_excel(writer, sheet_name=name, index=False, header=False)
                else: p_df.to_excel(writer, sheet_name=name)

            if df_catalina is not None: df_catalina.to_excel(writer, sheet_name=cat_name, index=False, header=False)
            if df_funcionarios is not None: df_funcionarios.to_excel(writer, sheet_name=func_name, index=False)
            if df_powerbi is not None: df_powerbi.to_excel(writer, sheet_name="BASE_DATA_POWERBI", index=False)
        print("Todos los cambios guardados exitosamente.")
    except Exception as e:
        print(f"Error al guardar: {e}")

    return df_principal

if __name__ == "__main__":
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G 2026.xlsx"
    if not os.path.exists(ruta_archivo): ruta_archivo = "Balance_Prueba_v33.xlsx"
    if os.path.exists(ruta_archivo): procesar_balance(ruta_archivo)
    else: print("Archivo no encontrado.")
