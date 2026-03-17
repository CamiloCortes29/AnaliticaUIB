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
    # A. Saldo Final (Moneda Local)
    col_debito = "Débito Moneda Local"
    col_credito = "Crédito Moneda Local"
    col_saldo = "Saldo Final (Moneda Local)"

    if col_debito in df_principal.columns and col_credito in df_principal.columns:
        df_principal[col_saldo] = pd.to_numeric(df_principal[col_debito], errors='coerce').fillna(0) - \
                                  pd.to_numeric(df_principal[col_credito], errors='coerce').fillna(0)
        print(f"Columna '{col_saldo}' calculada.")

    # B. Area_2 y Area_Informe
    col_area = "AREA"
    if col_area in df_principal.columns:
        df_principal["Area_2"] = df_principal[col_area].astype(str).str[:2]
        print("Columna 'Area_2' creada.")

    if df_ccosto is not None:
        col_ref_cc_id = "Area 2"
        col_ref_cc_nombre = "Area Informe"
        if col_ref_cc_id in df_ccosto.columns and col_ref_cc_nombre in df_ccosto.columns:
            df_ccosto[col_ref_cc_id] = df_ccosto[col_ref_cc_id].astype(str)
            mapeo_ccosto = df_ccosto.set_index(col_ref_cc_id)[col_ref_cc_nombre].to_dict()
            df_principal["Area_Informe"] = df_principal["Area_2"].map(mapeo_ccosto)
            print("Columna 'Area_Informe' creada.")

    # --- PARTE 3: Tabla Dinámica (TD Estrategias) con Filtros ---
    pivot_table = None
    try:
        # Normalizar fecha
        posibles_nombres_fecha = ["Fecha contabilización", "Fecha Contabilización", "Fecha contabilizacion", "Fecha Contabilizacion"]
        col_fecha = next((c for c in posibles_nombres_fecha if c in df_principal.columns), None)

        if col_fecha:
            df_principal[col_fecha] = pd.to_datetime(df_principal[col_fecha], errors='coerce')
            df_principal["Mes Contabilización"] = df_principal[col_fecha].dt.strftime('%Y-%m')

            # Aplicar filtros solicitados para la TD
            # Inf. Londres : COMMISSION PAID
            # Nombre SN : ESTRATEGIAS REA S.A.S.

            filtro_londres = "COMMISSION PAID"
            filtro_sn = "ESTRATEGIAS REA S.A.S."

            col_inf_londres = "inf. londres"
            col_nombre_sn = "Nombre SN"

            # Realizar una copia filtrada para la TD
            df_td = df_principal.copy()

            if col_inf_londres in df_td.columns:
                df_td = df_td[df_td[col_inf_londres].astype(str).str.strip().str.upper() == filtro_londres.upper()]

            if col_nombre_sn in df_td.columns:
                df_td = df_td[df_td[col_nombre_sn].astype(str).str.strip().str.upper() == filtro_sn.upper()]

            print(f"Filtros aplicados para TD: '{filtro_londres}' y '{filtro_sn}'. Filas resultantes: {len(df_td)}")

            if not df_td.empty:
                # Crear la tabla dinámica
                pivot_table = pd.pivot_table(
                    df_td,
                    values=col_saldo,
                    index=["Area_Informe"],
                    columns=["Mes Contabilización"],
                    aggfunc="sum",
                    fill_value=0
                )
                print("Tabla dinámica 'TD Estrategias' generada.")
            else:
                print("Advertencia: No hay datos que coincidan con los filtros para la tabla dinámica.")
        else:
            print("Error: No se encontró la columna de fecha.")

    except Exception as e:
        print(f"Error al generar la tabla dinámica: {e}")

    # 4. Guardar en el mismo archivo
    try:
        with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_principal.to_excel(writer, sheet_name="Procesado", index=False)
            if pivot_table is not None:
                pivot_table.to_excel(writer, sheet_name="TD Estrategias")
        print("Hojas 'Procesado' y 'TD Estrategias' guardadas exitosamente.")
    except Exception as e:
        print(f"Error al guardar el archivo: {e}")

    return df_principal

if __name__ == "__main__":
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"

    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba_v6.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
