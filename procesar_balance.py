import pandas as pd
import os

def procesar_balance(filepath):
    print(f"Leyendo archivo: {filepath}")

    # Leer la hoja principal "PG"
    try:
        df_principal = pd.read_excel(filepath, sheet_name="PG")
    except Exception as e:
        print(f"Error al leer 'PG': {e}")
        return

    # 1. Eliminar filas donde "Tipo Origen (Documento)" esté vacío
    col_filtro = "Tipo Origen (Documento)"
    if col_filtro in df_principal.columns:
        df_principal = df_principal.dropna(subset=[col_filtro])
        print(f"Filas filtradas por '{col_filtro}'.")
    else:
        print(f"Advertencia: No se encontró la columna '{col_filtro}'.")

    # 2. Leer la hoja de referencia "Inf.Londres"
    try:
        # Nota: El usuario especificó "Inf.Londres" (con 's' al final)
        df_londre = pd.read_excel(filepath, sheet_name="Inf.Londres")
    except Exception as e:
        print(f"Error al leer 'Inf.Londres': {e}")
        return

    # Definir columnas de búsqueda según aclaración actualizada
    # A: CUENTA (en Inf.Londres)
    # B: NOMBRE CUENTA (en Inf.Londres)
    # C: Cuenta contable (en PG)
    col_busqueda_ref = "CUENTA"
    col_resultado_ref = "NOMBRE CUENTA"
    col_busqueda_principal = "Cuenta contable"

    if col_busqueda_ref not in df_londre.columns:
        # Reintentar con "Cuenta contable" si "CUENTA" no existe en la hoja de referencia
        if "Cuenta contable" in df_londre.columns:
            col_busqueda_ref = "Cuenta contable"
        else:
            print(f"Error: No se encontró la columna de búsqueda '{col_busqueda_ref}' en Inf.Londres.")
            return

    # 3. Crear columna "inf. londres" usando lógica de búsqueda (merge/map)
    # Convertimos a diccionario para un mapeo rápido
    mapeo = df_londre.set_index(col_busqueda_ref)[col_resultado_ref].to_dict()

    # Aplicar el mapeo desde "Cuenta contable" (PG) a "inf. londres"
    df_principal["inf. londres"] = df_principal[col_busqueda_principal].map(mapeo)
    print("Columna 'inf. londres' creada.")

    # 4. Guardar en una nueva hoja "Procesado" en el mismo archivo
    with pd.ExcelWriter(filepath, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        df_principal.to_excel(writer, sheet_name="Procesado", index=False)

    print("Hoja 'Procesado' guardada exitosamente.")
    return df_principal

if __name__ == "__main__":
    # Ruta proporcionada por el usuario (ajustada según su código)
    ruta_archivo = r"C:\Users\ccortes\UIB COLOMBIA S.A. Corredores de Reaseguros\Analitica Datos - Documentos\Informes área datos\Balance x terceros Ene-Feb P&G Prueba.xlsx"

    # Para propósitos de desarrollo en este entorno, usaremos un nombre local si el archivo no existe
    if not os.path.exists(ruta_archivo):
        ruta_archivo = "Balance_Prueba_v2.xlsx"
        print(f"Ruta original no encontrada, usando local: {ruta_archivo}")

    if os.path.exists(ruta_archivo):
        procesar_balance(ruta_archivo)
    else:
        print("Archivo no encontrado para procesar.")
