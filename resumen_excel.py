import pandas as pd
import os
import re

def crear_resumen_ene_feb(ruta_entrada, hoja="Datos"):
    print(f"Iniciando procesamiento de: {ruta_entrada}")

    # 1. Leer Excel
    try:
        # Intentar leer la hoja especificada, si no existe leer la primera
        xl = pd.ExcelFile(ruta_entrada)
        if hoja in xl.sheet_names:
            df = pd.read_excel(ruta_entrada, sheet_name=hoja)
        else:
            print(f"Advertencia: La hoja '{hoja}' no existe. Usando la primera hoja: {xl.sheet_names[0]}")
            df = pd.read_excel(ruta_entrada, sheet_name=0)
    except Exception as e:
        print(f"Error al leer el archivo: {e}")
        return None

    # 2. Validar columnas requeridas
    columnas_requeridas = ["Asegurado", "Tipo Mvto", "Mvto UK", "Vlr FV", "Fecha FV-Ncr"]
    faltantes = [col for col in columnas_requeridas if col not in df.columns]
    if faltantes:
        print(f"Error: Faltan las siguientes columnas requeridas: {faltantes}")
        return None

    print("Columnas validadas correctamente.")

    # 3. Limpieza y Normalización

    # Asegurado: recorta espacios iniciales/finales y colapsa múltiples espacios internos a uno
    df['Asegurado'] = df['Asegurado'].astype(str).apply(lambda x: re.sub(r'\s+', ' ', x.strip()))

    # Mvto UK: recorta espacios
    df['Mvto UK'] = df['Mvto UK'].astype(str).str.strip()

    # Vlr FV: quitar puntos de miles y reemplazar coma decimal por punto antes de convertir a float
    def clean_currency(value):
        if pd.isna(value):
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        val_str = str(value).strip()
        # "17.959.104,00" -> "17959104.00"
        val_str = val_str.replace('.', '').replace(',', '.')
        try:
            return float(val_str)
        except ValueError:
            return 0.0

    df['Vlr FV'] = df['Vlr FV'].apply(clean_currency)

    # Fecha FV-Ncr: convertir a fecha
    df['Fecha FV-Ncr'] = pd.to_datetime(df['Fecha FV-Ncr'], dayfirst=True, errors="coerce")

    # Descartar nulos en fecha
    df = df.dropna(subset=['Fecha FV-Ncr'])

    # 4. Filtrar por periodos
    # Periodo 2025: 01/01/2025 al 28/02/2025
    # Periodo 2026: 01/01/2026 al 28/02/2026

    mask_2025 = (df['Fecha FV-Ncr'] >= '2025-01-01') & (df['Fecha FV-Ncr'] <= '2025-02-28')
    mask_2026 = (df['Fecha FV-Ncr'] >= '2026-01-01') & (df['Fecha FV-Ncr'] <= '2026-02-28')

    df_filtrado = df[mask_2025 | mask_2026].copy()

    # Etiquetar periodo
    df_filtrado['Periodo'] = 'Otro'
    df_filtrado.loc[mask_2025, 'Periodo'] = '2025'
    df_filtrado.loc[mask_2026, 'Periodo'] = '2026'

    print(f"Filas filtradas para los periodos de interés: {len(df_filtrado)}")

    # 5. Agrupar y Sumar
    # Agrupamos por Asegurado, Mvto UK y Periodo
    resumen = df_filtrado.groupby(['Asegurado', 'Mvto UK', 'Periodo'])['Vlr FV'].sum().reset_index()

    # 6. Pivotear para tener periodos en columnas
    pivot = resumen.pivot(index=['Asegurado', 'Mvto UK'], columns='Periodo', values='Vlr FV').reset_index()

    # Asegurar que existan ambas columnas de año, si no existen poner 0
    if '2025' not in pivot.columns:
        pivot['2025'] = 0.0
    if '2026' not in pivot.columns:
        pivot['2026'] = 0.0

    pivot = pivot.fillna(0)

    # 7. Calcular Variación
    pivot['Variacion'] = pivot['2026'] - pivot['2025']

    # 8. Renombrar y Reordenar columnas
    # Orden deseado: Asegurado, Valor Ene-Feb 2025, Valor Ene-Feb 2026, Variacion (2026 – 2025), Mvto UK
    resultado = pivot.rename(columns={
        '2025': 'Valor Ene-Feb 2025',
        '2026': 'Valor Ene-Feb 2026',
        'Variacion': 'Variacion (2026 – 2025)'
    })

    columnas_finales = [
        'Asegurado',
        'Valor Ene-Feb 2025',
        'Valor Ene-Feb 2026',
        'Variacion (2026 – 2025)',
        'Mvto UK'
    ]
    resultado = resultado[columnas_finales]

    # 9. Ordenar resultado
    resultado = resultado.sort_values(by=['Asegurado', 'Mvto UK'])

    # 10. Exportar
    nombre_base, ext = os.path.splitext(ruta_entrada)
    ruta_salida = f"{nombre_base}_resumen.xlsx"

    try:
        with pd.ExcelWriter(ruta_salida, engine='openpyxl') as writer:
            resultado.to_excel(writer, sheet_name="Resumen Ene-Feb", index=False)
        print(f"Archivo de salida creado: {ruta_salida}")
    except Exception as e:
        print(f"Error al escribir el archivo de salida: {e}")

    return resultado

if __name__ == "__main__":
    archivo_entrada = "archivo_entrada.xlsx"
    df_resumen = crear_resumen_ene_feb(archivo_entrada)

    if df_resumen is not None:
        print("\nVista previa del resultado:")
        print(df_resumen.head())
    else:
        print("No se pudo generar el resumen.")
