import pandas as pd
import os

def procesar_balance(filepath):
    print(f"Leyendo archivo: {filepath}")

    # 1. Leer hojas necesarias
    try:
        df_principal = pd.read_excel(filepath, sheet_name="PG")
    except Exception as e:
        print(f"Error al leer 'PG': {e}")
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
        df_principal[col_saldo] = pd.to_numeric(df_principal[col_debito], errors='coerce').fillna(0) - \
                                  pd.to_numeric(df_principal[col_credito], errors='coerce').fillna(0)

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

    # --- PARTE 3: Tabla Dinámica (TD Estrategias) ---
    pivot_table = None
    try:
        posibles_nombres_fecha = ["Fecha contabilización", "Fecha Contabilización", "Fecha contabilizacion", "Fecha Contabilizacion"]
        col_fecha = next((c for c in posibles_nombres_fecha if c in df_principal.columns), None)
        if col_fecha:
            df_principal[col_fecha] = pd.to_datetime(df_principal[col_fecha], errors='coerce')
            df_principal["Mes Contabilización"] = df_principal[col_fecha].dt.strftime('%Y-%m')

            filtro_londres = "COMMISSION PAID"
            filtro_sn = "ESTRATEGIAS REA S.A.S."
            df_td = df_principal.copy()
            if "inf. londres" in df_td.columns:
                df_td = df_td[df_td["inf. londres"].astype(str).str.strip().str.upper() == filtro_londres.upper()]
            if "Nombre SN" in df_td.columns:
                df_td = df_td[df_td["Nombre SN"].astype(str).str.strip().str.upper() == filtro_sn.upper()]

            if not df_td.empty:
                pivot_table = pd.pivot_table(
                    df_td, values=col_saldo, index=["Area_2", "Area_Informe"],
                    columns=["Mes Contabilización"], aggfunc="sum", fill_value=0
                )
    except Exception as e:
        print(f"Error al generar la tabla dinámica: {e}")

    # --- PARTES 4, 5, 6 & 7: Actualizar Hoja "Catalina Valencia" ---
    df_catalina = None
    try:
        df_catalina = pd.read_excel(filepath, sheet_name="Catalina Valencia", header=None)
        if pivot_table is not None:
            meses_map = {
                '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
                '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
                '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
            }
            pivot_data = pivot_table.reset_index()
            cols_meses_pivot = [c for c in pivot_data.columns if c not in ["Area_2", "Area_Informe"]]

            row_header_idx = 16
            col_area_idx = 0 # Columna A
            header_row = df_catalina.iloc[row_header_idx]

            for col_mes_p in cols_meses_pivot:
                mes_num = col_mes_p.split('-')[1]
                nombre_mes_target = meses_map.get(mes_num)
                col_mes_idx = header_row[header_row == nombre_mes_target].index[0] if nombre_mes_target in header_row.values else None

                if col_mes_idx is not None:
                    # Parte 4: Valores de áreas (18-29)
                    for i in range(17, 29):
                        area_num_val = str(df_catalina.iloc[i, col_area_idx]).strip()
                        if not area_num_val or area_num_val == "nan": continue
                        match = pivot_data[pivot_data["Area_2"].astype(str).str.strip() == area_num_val]
                        df_catalina.iloc[i, col_mes_idx] = match[col_mes_p].values[0] if not match.empty else 0

                    # Parte 5: Total (30) y Porcentajes (35-47)
                    total_col = pd.to_numeric(df_catalina.iloc[17:29, col_mes_idx], errors='coerce').fillna(0).sum()
                    df_catalina.iloc[29, col_mes_idx] = total_col

                    # Calcular porcentajes en 35-47
                    for j in range(34, 47):
                        area_perc_val = str(df_catalina.iloc[j, col_area_idx]).strip()
                        if not area_perc_val or area_perc_val == "nan": continue
                        # Buscar valor en 18-29
                        val_area = 0
                        for r_search in range(17, 29):
                            if str(df_catalina.iloc[r_search, col_area_idx]).strip() == area_perc_val:
                                val_area = df_catalina.iloc[r_search, col_mes_idx]
                                break
                        df_catalina.iloc[j, col_mes_idx] = (val_area / total_col) if total_col != 0 else 0

                    # Parte 6: Distribución por Valor Base (Línea 3 -> Índice 2)
                    # Multiplicar % (35-47) por Valor Línea 3
                    val_base_linea_3 = pd.to_numeric(df_catalina.iloc[2, col_mes_idx], errors='coerce') or 0
                    for k in range(52, 65): # Desde línea 53 (índice 52)
                        if k >= len(df_catalina): break
                        area_dist_val = str(df_catalina.iloc[k, col_area_idx]).strip()
                        if not area_dist_val or area_dist_val == "nan": continue
                        # Buscar % en 35-47
                        perc_area = 0
                        for r_perc in range(34, 47):
                            if str(df_catalina.iloc[r_perc, col_area_idx]).strip() == area_dist_val:
                                perc_area = df_catalina.iloc[r_perc, col_mes_idx]
                                break
                        df_catalina.iloc[k, col_mes_idx] = perc_area * val_base_linea_3

                    # Parte 7: Distribución por Suma de Rango (Líneas 4-13 -> Índices 3-12)
                    suma_rango_4_13 = pd.to_numeric(df_catalina.iloc[3:13, col_mes_idx], errors='coerce').fillna(0).sum()
                    for l in range(68, 81): # Desde línea 69 (índice 68)
                        if l >= len(df_catalina): break
                        area_range_val = str(df_catalina.iloc[l, col_area_idx]).strip()
                        if not area_range_val or area_range_val == "nan": continue
                        # Buscar % en 35-47
                        perc_area_r = 0
                        for r_perc_r in range(34, 47):
                            if str(df_catalina.iloc[r_perc_r, col_area_idx]).strip() == area_range_val:
                                perc_area_r = df_catalina.iloc[r_perc_r, col_mes_idx]
                                break
                        df_catalina.iloc[l, col_mes_idx] = perc_area_r * suma_rango_4_13

            print("Hoja 'Catalina Valencia' actualizada con todas las distribuciones (Partes 4-7).")
    except Exception as e:
        print(f"Error al actualizar 'Catalina Valencia': {e}")

    # Guardar todo
    try:
        with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_principal.to_excel(writer, sheet_name="Procesado", index=False)
            if pivot_table is not None:
                pivot_table.to_excel(writer, sheet_name="TD Estrategias")
            if df_catalina is not None:
                df_catalina.to_excel(writer, sheet_name="Catalina Valencia", index=False, header=False)
        print("Cambios guardados exitosamente.")
    except Exception as e:
        print(f"Error al guardar el archivo: {e}")

    return df_principal

if __name__ == "__main__":
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"
    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba_v10.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
