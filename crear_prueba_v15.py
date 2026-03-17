import pandas as pd

def crear_archivo_prueba_v15():
    filepath = "Balance_Prueba_v15.xlsx"

    # Hoja PG con registros para Catalina Valencia Gomez
    data_pg = {
        "Tipo Origen (Documento)": ["FAC", "FAC"],
        "Cuenta contable": ["1101", "1102"],
        "Débito Moneda Local": [1000, 2000],
        "Crédito Moneda Local": [0, 0],
        "AREA": [5000, 5210],
        "Nombre SN": ["CATALINA VALENCIA GOMEZ", "CATALINA VALENCIA GOMEZ"],
        "Fecha contabilización": ["31/01/2026", "01/02/2026"]
    }
    df1 = pd.DataFrame(data_pg)

    # Hoja Inf.Londres
    data_londre = {
        "CUENTA": ["1101", "1102"],
        "NOMBRE CUENTA": ["SALARIES", "OTHER STAFF COSTS"]
    }
    df2 = pd.DataFrame(data_londre)

    # Hoja Centro de Costo
    data_ccosto = {"Area 2": ["50", "52"], "Area Informe": ["REPORTING", "GENERAL"]}
    df3 = pd.DataFrame(data_ccosto)

    # Hoja Catalina Valencia con valores de distribución en ambos rangos
    rows = [[""] * 5 for _ in range(85)]
    rows[16] = ["Area", "Nombre", "Ene", "Feb", "Mar"] # Línea 17
    rows[52] = ["50", "SALARIES DIST 50", 100, 50, 0] # Línea 53
    rows[53] = ["52", "SALARIES DIST 52", 200, 100, 0]   # Línea 54
    rows[68] = ["50", "OTHER DIST 50", 500, 250, 0] # Línea 69
    rows[69] = ["52", "OTHER DIST 52", 1000, 500, 0]   # Línea 70

    df4 = pd.DataFrame(rows)

    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df1.to_excel(writer, sheet_name="PG", index=False)
        df2.to_excel(writer, sheet_name="Inf.Londres", index=False)
        df3.to_excel(writer, sheet_name="Centro de Costo", index=False)
        df4.to_excel(writer, sheet_name="Catalina Valencia", index=False, header=False)

    print(f"Archivo de prueba '{filepath}' creado.")

if __name__ == "__main__":
    crear_archivo_prueba_v15()
