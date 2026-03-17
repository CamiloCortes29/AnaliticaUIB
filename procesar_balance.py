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
        print(f"Filas filtradas por '{col_filtro_origen}'.")

    # Mapeo para "inf. londres"
    col_busqueda_ref = "CUENTA"
    col_resultado_ref = "NOMBRE CUENTA"
    col_busqueda_principal = "Cuenta contable"

    if col_busqueda_ref in df_londre.columns:
        mapeo_londre = df_londre.set_index(col_busqueda_ref)[col_resultado_ref].to_dict()
        df_principal["inf. londres"] = df_principal[col_busqueda_principal].map(mapeo_londre)
        print("Columna 'inf. londres' creada.")

    # --- PARTE 2: Cálculos y Áreas ---
    col_debito = "Débito Moneda Local"
    col_credito = "Crédito Moneda Local"
    col_saldo = "Saldo Final (Moneda Local)"

    if col_debito in df_principal.columns and col_credito in df_principal.columns:
        df_principal[col_saldo] = pd.to_numeric(df_principal[col_debito], errors='coerce').fillna(0) - \
                                  pd.to_numeric(df_principal[col_credito], errors='coerce').fillna(0)
        print(f"Columna '{col_saldo}' calculada.")

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
            print("Columna 'Area_Informe' creada.")

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
                    df_td,
                    values=col_saldo,
                    index=["Area_2", "Area_Informe"],
                    columns=["Mes Contabilización"],
                    aggfunc="sum",
                    fill_value=0
                )
                print("Tabla dinámica 'TD Estrategias' generada.")
    except Exception as e:
        print(f"Error al generar la tabla dinámica: {e}")

    # --- PARTE 4 & 5: Actualizar Hoja "Catalina Valencia" ---
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
                    # 4. Poblar valores de áreas (Línea 18-29)
                    for i in range(17, 29):
                        if i >= len(df_catalina): break
                        area_num_val = str(df_catalina.iloc[i, col_area_idx]).strip()
                        if not area_num_val or area_num_val == "nan": continue

                        match = pivot_data[pivot_data["Area_2"].astype(str).str.strip() == area_num_val]
                        if not match.empty:
                            df_catalina.iloc[i, col_mes_idx] = match[col_mes_p].values[0]
                        else:
                            df_catalina.iloc[i, col_mes_idx] = 0

                    # 5. Totales (Línea 30 - Índice 29)
                    # Sumar las líneas 18 a 29
                    total_col = pd.to_numeric(df_catalina.iloc[17:29, col_mes_idx], errors='coerce').fillna(0).sum()
                    df_catalina.iloc[29, col_mes_idx] = total_col
                    df_catalina.iloc[29, col_area_idx] = "Total"

                    # 6. Porcentajes (Desde Línea 35 - Índice 34)
                    # La idea es buscar el área en las líneas 35+ y calcular su % respecto al total de la línea 30
                    for j in range(34, len(df_catalina)):
                        area_perc_val = str(df_catalina.iloc[j, col_area_idx]).strip()
                        if not area_perc_val or area_perc_val == "nan" or area_perc_val == "Total": continue

                        # Buscar el valor de esta área en la sección de arriba (líneas 18-29)
                        area_upper_row = None
                        for r_search in range(17, 29):
                            if str(df_catalina.iloc[r_search, col_area_idx]).strip() == area_perc_val:
                                area_upper_row = r_search
                                break

                        if area_upper_row is not None:
                            val_area = df_catalina.iloc[area_upper_row, col_mes_idx]
                            if total_col != 0:
                                df_catalina.iloc[j, col_mes_idx] = (val_area / total_col)
                            else:
                                df_catalina.iloc[j, col_mes_idx] = 0

            print("Hoja 'Catalina Valencia' actualizada con Totales y Porcentajes.")
    except Exception as e:
        print(f"Error al actualizar 'Catalina Valencia': {e}")

    # 7. Guardar todo
    try:
        with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_principal.to_excel(writer, sheet_name="Procesado", index=False)
            if pivot_table is not None:
                pivot_table.to_excel(writer, sheet_name="TD Estrategias")
            if df_catalina is not None:
                # Guardar sin headers para mantener formato original
                df_catalina.to_excel(writer, sheet_name="Catalina Valencia", index=False, header=False)
        print("Cambios guardados exitosamente.")
    except Exception as e:
        print(f"Error al guardar el archivo: {e}")

    return df_principal

if __name__ == "__main__":
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"
    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba_v9.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
