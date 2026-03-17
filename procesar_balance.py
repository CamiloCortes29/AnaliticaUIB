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
    col_filtro = "Tipo Origen (Documento)"
    if col_filtro in df_principal.columns:
        df_principal = df_principal.dropna(subset=[col_filtro]).copy()
        print(f"Filas filtradas por '{col_filtro}'.")
    else:
        print(f"Advertencia: No se encontró la columna '{col_filtro}'.")

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
        df_principal[col_saldo] = df_principal[col_debito] - df_principal[col_credito]
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

    # --- PARTE 3: Tabla Dinámica (TD Estrategias) ---
    # Columnas requeridas: Area_Informe (filas), Fecha Contabilizacion (columnas),
    # Saldo Final (Moneda Local) (valores)
    # Filtros sugeridos (Inf. Londres, Nombre SN) - nota: pandas pivot tables
    # no tienen filtros nativos de Excel UI pero se pueden agrupar por ellos.

    try:
        # Asegurar que la fecha esté en formato adecuado
        col_fecha = "Fecha Contabilizacion"
        if col_fecha in df_principal.columns:
            df_principal[col_fecha] = pd.to_datetime(df_principal[col_fecha], dayfirst=True, errors='coerce')

        # Crear la tabla dinámica
        # Nota: Los filtros "Inf. Londres" y "Nombre SN" son informativos en este contexto
        # a menos que el usuario pida filtrado previo o inclusión en el pivot.
        # Por ahora se genera el resumen por Area e Informe.
        pivot_table = pd.pivot_table(
            df_principal,
            values=col_saldo,
            index=["Area_Informe"],
            columns=[col_fecha],
            aggfunc="sum",
            fill_value=0
        )
        print("Tabla dinámica 'TD Estrategias' generada.")
    except Exception as e:
        print(f"Error al generar la tabla dinámica: {e}")
        pivot_table = None

    # 4. Guardar en el mismo archivo
    with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        df_principal.to_excel(writer, sheet_name="Procesado", index=False)
        if pivot_table is not None:
            pivot_table.to_excel(writer, sheet_name="TD Estrategias")

    print("Hojas 'Procesado' y 'TD Estrategias' guardadas exitosamente.")
    return df_principal

if __name__ == "__main__":
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"

    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba_v4.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
