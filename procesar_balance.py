import pandas as pd
import os

def procesar_balance(filepath):
    print(f"Leyendo archivo: {filepath}")

    # Leer la hoja principal
    try:
        df_principal = pd.read_excel(filepath, sheet_name="Hoja1")
    except Exception as e:
        print(f"Error al leer 'Hoja1': {e}")
        return

    # 1. Eliminar filas donde "Tipo Origen (Documento)" esté vacío
    col_filtro = "Tipo Origen (Documento)"
    if col_filtro in df_principal.columns:
        df_principal = df_principal.dropna(subset=[col_filtro])
        print(f"Filas filtradas por '{col_filtro}'.")
    else:
        print(f"Advertencia: No se encontró la columna '{col_filtro}'.")

    # 2. Leer la hoja de referencia "Inf.Londre"
    try:
        df_londre = pd.read_excel(filepath, sheet_name="Inf.Londre")
    except Exception as e:
        print(f"Error al leer 'Inf.Londre': {e}")
        return

    # Definir columnas de búsqueda según aclaración
    # A: CUENTA (donde buscamos)
    # B: NOMBRE CUENTA (lo que traemos)
    col_busqueda_ref = "CUENTA"
    col_resultado_ref = "NOMBRE CUENTA"
    col_busqueda_principal = "nombre cuenta"

    if col_busqueda_ref not in df_londre.columns:
        # Reintentar con "Cuenta contable" si "CUENTA" no existe
        if "Cuenta contable" in df_londre.columns:
            col_busqueda_ref = "Cuenta contable"
        else:
            print(f"Error: No se encontró la columna de búsqueda en Inf.Londre.")
            return

    # 3. Crear columna "inf. londre" usando BUSCARV (merge/map)
    # Convertimos a diccionario para un mapeo rápido (tipo BUSCARV)
    mapeo = df_londre.set_index(col_busqueda_ref)[col_resultado_ref].to_dict()

    df_principal["inf. londre"] = df_principal[col_busqueda_principal].map(mapeo)
    print("Columna 'inf. londre' creada.")

    # 4. Guardar en una nueva hoja "Procesado" en el mismo archivo
    # Usamos ExcelWriter para no borrar las hojas existentes
    with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        df_principal.to_excel(writer, sheet_name="Procesado", index=False)

    print("Hoja 'Procesado' guardada exitosamente.")
    return df_principal

if __name__ == "__main__":
    # Ruta proporcionada por el usuario
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G 2026.xlsx"

    # Para propósitos de desarrollo en este entorno, usaremos un nombre local si el archivo no existe
    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
