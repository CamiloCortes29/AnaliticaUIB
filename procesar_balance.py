import pandas as pd
import os

def procesar_balance(filepath):
    print(f"Iniciando procesamiento de: {filepath}")

    # 1. Leer hojas necesarias
    try:
        df_principal = pd.read_excel(filepath, sheet_name="PG")
        print("Hoja 'PG' leída correctamente.")
    except Exception as e:
        print(f"Error crítico al leer 'PG': {e}")
        return

    try:
        df_londre = pd.read_excel(filepath, sheet_name="Inf.Londres")
    except Exception as e:
        print(f"Error al leer 'Inf.Londres': {e}")
        return

    try:
        df_ccosto = pd.read_excel(filepath, sheet_name="Centro de Costo")
    except Exception as e:
        print(f"Error al leer 'Centro de Costo': {e}")
        df_ccosto = None

    # --- PARTE 1: Filtrado y VLOOKUP Inicial ---
    col_filtro_origen = "Tipo Origen (Documento)"
    if col_filtro_origen in df_principal.columns:
        df_principal = df_principal.dropna(subset=[col_filtro_origen]).copy()

    # Mapeo para "inf. londres"
    col_busqueda_ref = "CUENTA"
    col_resultado_ref = "NOMBRE CUENTA"
    col_busqueda_principal = "Cuenta contable"
    if col_busqueda_ref in df_londre.columns:
        mapeo_londre = df_londre.set_index(col_busqueda_ref)[col_resultado_ref].to_dict()
        df_principal["inf. londres"] = df_principal[col_busqueda_principal].map(mapeo_londre)

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
        df_principal["Area_2"] = df_principal[col_area].astype(str).str[:2]

    if df_ccosto is not None:
        col_ref_cc_id = "Area 2"
        col_ref_cc_nombre = "Area Informe"
        if col_ref_cc_id in df_ccosto.columns and col_ref_cc_nombre in df_ccosto.columns:
            df_ccosto[col_ref_cc_id] = df_ccosto[col_ref_cc_id].astype(str).str.strip()
            mapeo_ccosto = df_ccosto.set_index(col_ref_cc_id)[col_ref_cc_nombre].to_dict()
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
        df_catalina = pd.read_excel(filepath, sheet_name="Catalina Valencia", header=None)
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
                    inf_l = str(row["inf. londres"]).strip().upper()
                    t_dist = d_sal if "SALARIES" in inf_l else d_oth if "OTHER STAFF COSTS" in inf_l else []
                    v_d = pd.to_numeric(row[col_debito], errors='coerce') or 0; v_c = pd.to_numeric(row[col_credito], errors='coerce') or 0
                    r_rev = row.copy(); r_rev[col_debito], r_rev[col_credito] = v_c, v_d; r_rev[col_saldo] = r_rev[col_debito] - r_rev[col_credito]
                    nuevos_registros.append(r_rev)
                    if v_d > 0 and t_dist:
                        for item in t_dist:
                            n_r = row.copy(); n_r["AREA"] = item["area"]; n_r[col_debito] = pd.to_numeric(item["dist"].get(mes_esp_f, 0), errors='coerce') or 0
                            n_r[col_credito] = 0; n_r[col_saldo] = n_r[col_debito] - n_r[col_credito]; nuevos_registros.append(n_r)
            # 2. Ajuste Brokerage S
            df_seg_source = df_principal[(df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "UIB CORREDORES DE SEGUROS S.A.") &
                                         (df_principal["inf. londres"].astype(str).str.strip().str.upper() == "COMMISSION PAID")].copy()
            for _, row in df_seg_source.iterrows():
                r_b = row.copy(); r_b[col_credito] = pd.to_numeric(row[col_debito], errors='coerce') or 0; r_b[col_debito] = 0
                r_b["inf. londres"] = "BROKERAGE S"; r_b[col_saldo] = r_b[col_debito] - r_b[col_credito]; nuevos_registros.append(r_b)

        if nuevos_registros:
            df_principal = pd.concat([df_principal, pd.DataFrame(nuevos_registros)], ignore_index=True)
            print(f"Ajustes consolidados: {len(nuevos_registros)} filas añadidas.")
    except Exception as e:
        print(f"Error en fase de ajustes: {e}")

    # --- AJUSTE MEDELLIN (100 -> 70) ---
    try:
        col_proyecto = "Nombre proyecto"
        if col_proyecto in df_principal.columns and "Area_Informe" in df_principal.columns:
            # Asegurar consistencia de tipos
            df_principal["Area_Informe"] = df_principal["Area_Informe"].astype(str).str.replace(".0", "", regex=False).str.strip()
            mask_medellin = (df_principal[col_proyecto].astype(str).str.strip().str.upper() == "MEDELLIN") & (df_principal["Area_Informe"] == "100")
            df_principal.loc[mask_medellin, "Area_Informe"] = "70"
            print(f"Ajuste Medellín aplicado: {mask_medellin.sum()} registros actualizados de 100 a 70.")
    except Exception as e:
        print(f"Error en ajuste Medellín: {e}")

    # --- OVERRIDE AREA_INFORME = 20 ---
    try:
        if "inf. londres" in df_principal.columns and "Area_Informe" in df_principal.columns:
            df_principal["Area_Informe"] = df_principal["Area_Informe"].astype(str).str.replace(".0", "", regex=False).str.strip()
            condicion_override = df_principal["inf. londres"].astype(str).str.strip().str.upper().isin(["COMMISSION PAID", "BROKERAGE S"])
            df_principal.loc[condicion_override, "Area_Informe"] = "20"
            print("Override Area_Informe = 20 aplicado.")
    except Exception as e:
        print(f"Error en override de Area_Informe: {e}")

    # --- TABLAS DINÁMICAS FINALES ---
    pivots_finales = {}
    try:
        # Asegurar que Area_Informe no sea nan para pivots
        df_principal["Area_Informe"] = df_principal["Area_Informe"].replace("nan", "Desconocido")

        df_est_f = df_principal[(df_principal["inf. londres"].astype(str).str.strip().str.upper() == "COMMISSION PAID") & (df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "ESTRATEGIAS REA S.A.S.")]
        if not df_est_f.empty: pivots_finales["TD Estrategias"] = pd.pivot_table(df_est_f, values=col_saldo, index=["Area_2", "Area_Informe"], columns=["Mes Contabilización"], aggfunc="sum", fill_value=0)

        df_seg_f = df_principal[(df_principal["inf. londres"].astype(str).str.strip().str.upper() == "COMMISSION PAID") & (df_principal["Nombre SN"].astype(str).str.strip().str.upper() == "UIB CORREDORES DE SEGUROS S.A.")]
        if not df_seg_f.empty: pivots_finales["TD SEGUROS"] = pd.pivot_table(df_seg_f, values=col_saldo, index=["Area_Informe"], columns=["Mes Contabilización"], aggfunc="sum", fill_value=0)

        pivot_mov = pd.pivot_table(df_principal, values=col_saldo, index=["inf. londres"], columns=["Area_Informe"], aggfunc="sum", fill_value=0)
        pivot_mov = pivot_mov.reindex(sorted(pivot_mov.columns), axis=1)
        total_mov = pivot_mov.sum().to_frame().T; total_mov.index = ["Total"]; pivot_mov = pd.concat([pivot_mov, total_mov])
        pivots_finales["TD Movimiento 2026"] = pivot_mov
        print("Tablas dinámicas finales generadas.")
    except Exception as e:
        print(f"Error en tablas dinámicas finales: {e}")

    # --- FUNCIONARIOS ---
    df_funcionarios = None
    try:
        df_funcionarios = pd.read_excel(filepath, sheet_name="Funcionarios")
        for col_idx in [10, 11, 12]:
            while len(df_funcionarios.columns) <= col_idx: df_funcionarios[f"Col_{len(df_funcionarios.columns)}"] = None
            df_funcionarios[df_funcionarios.columns[col_idx]] = df_funcionarios[df_funcionarios.columns[col_idx]].astype(object)
        conteos = df_funcionarios[df_funcionarios.columns[3]].dropna().astype(str).str.strip().value_counts().reset_index()
        conteos.columns = ["AREA INFORME", "No. funcionarios"]; total_f = conteos["No. funcionarios"].sum()
        df_funcionarios.iloc[0, 10], df_funcionarios.iloc[0, 11], df_funcionarios.iloc[0, 12] = "AREA INFORME", "No. funcionarios", "% participación"
        for i, r_c in conteos.iterrows():
            if (i+1) < len(df_funcionarios): df_funcionarios.iloc[i+1, 10], df_funcionarios.iloc[i+1, 11], df_funcionarios.iloc[i+1, 12] = r_c["AREA INFORME"], r_c["No. funcionarios"], (r_c["No. funcionarios"]/total_f)
        idx_t = len(conteos)+1
        if idx_t < len(df_funcionarios): df_funcionarios.iloc[idx_t, 10], df_funcionarios.iloc[idx_t, 11], df_funcionarios.iloc[idx_t, 12] = "Total", total_f, 1.0
        print("Hoja 'Funcionarios' procesada.")
    except Exception as e:
        print(f"Error en Funcionarios: {e}")

    # Guardar
    try:
        df_final = df_principal.copy()
        df_final[col_fecha] = pd.to_datetime(df_final[col_fecha], dayfirst=True).dt.date
        with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_final.to_excel(writer, sheet_name="Procesado", index=False)
            for name, p_df in pivots_finales.items(): p_df.to_excel(writer, sheet_name=name)
            if df_catalina is not None: df_catalina.to_excel(writer, sheet_name="Catalina Valencia", index=False, header=False)
            if df_funcionarios is not None: df_funcionarios.to_excel(writer, sheet_name="Funcionarios", index=False)
        print("Todos los cambios guardados exitosamente.")
    except Exception as e:
        print(f"Error al guardar: {e}")

    return df_principal

if __name__ == "__main__":
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"
    if not os.path.exists(ruta_archivo): ruta_archivo = "Balance_Prueba_v27.xlsx"
    if os.path.exists(ruta_archivo): procesar_balance(ruta_archivo)
    else: print("Archivo no encontrado.")
