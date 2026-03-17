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
    # Eliminar filas donde "Tipo Origen (Documento)" esté vacío
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
    else:
        print(f"Error: No se encontró la columna de búsqueda '{col_busqueda_ref}' en Inf.Londres.")

    # --- PARTE 2: Cálculos y Áreas ---
    # A. Saldo Final (Moneda Local) = Débito Moneda Local - Crédito Moneda Local
    col_debito = "Débito Moneda Local"
    col_credito = "Crédito Moneda Local"
    col_saldo = "Saldo Final (Moneda Local)"

    if col_debito in df_principal.columns and col_credito in df_principal.columns:
        df_principal[col_saldo] = df_principal[col_debito] - df_principal[col_credito]
        print(f"Columna '{col_saldo}' calculada.")
    else:
        print(f"Advertencia: No se encontraron las columnas '{col_debito}' o '{col_credito}'.")

    # B. Area_2 (Primeros 2 números de AREA)
    col_area = "AREA"
    if col_area in df_principal.columns:
        # Convertir a string para extraer los primeros 2 caracteres
        df_principal["Area_2"] = df_principal[col_area].astype(str).str[:2]
        print("Columna 'Area_2' creada.")
    else:
        print(f"Advertencia: No se encontró la columna '{col_area}'.")

    # C. Area_Informe (BUSCARV en Centro de Costo)
    if df_ccosto is not None:
        col_ref_cc_id = "Area 2"
        col_ref_cc_nombre = "Area Informe"

        if col_ref_cc_id in df_ccosto.columns and col_ref_cc_nombre in df_ccosto.columns:
            # Asegurarse de que las columnas de cruce sean strings para el mapeo
            df_ccosto[col_ref_cc_id] = df_ccosto[col_ref_cc_id].astype(str)
            mapeo_ccosto = df_ccosto.set_index(col_ref_cc_id)[col_ref_cc_nombre].to_dict()

            df_principal["Area_Informe"] = df_principal["Area_2"].map(mapeo_ccosto)
            print("Columna 'Area_Informe' creada.")
        else:
            print("Error: Columnas 'Area 2' o 'Area Informe' no encontradas en Centro de Costo.")

    # 4. Guardar en una nueva hoja "Procesado" en el mismo archivo
    with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        df_principal.to_excel(writer, sheet_name="Procesado", index=False)

    print("Hoja 'Procesado' guardada exitosamente.")
    return df_principal

if __name__ == "__main__":
    # Ruta proporcionada por el usuario
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"

    # Para desarrollo, usaremos un nombre local si el archivo no existe
    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba_v3.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
