import pandas as pd

def create_sample_excel(filename):
    data = [
        # Ene-Feb 2026 data
        {
            "Asegurado": "ACCESORIOS  GLOBALES S.A.  Y/ O  TATA S.A",
            "Tipo Mvto": "A",
            "Mvto UK": "Other",
            "Vlr FV": "17.959.104,00",
            "Fecha FV-Ncr": "30/01/2026"
        },
        {
            "Asegurado": "ACCESORIOS  GLOBALES S.A.  Y/ O  TATA S.A",
            "Tipo Mvto": "A",
            "Mvto UK": "Other",
            "Vlr FV": "17.959.104,00",
            "Fecha FV-Ncr": "30/01/2026"
        },
        {
            "Asegurado": "ACCESORIOS  GLOBALES S.A.  Y/ O  TATA S.A",
            "Tipo Mvto": "A",
            "Mvto UK": "Other",
            "Vlr FV": "17.964.486,00",
            "Fecha FV-Ncr": "30/01/2026"
        },
        # Ene-Feb 2025 data
        {
            "Asegurado": "ACCESORIOS GLOBALES S.A. Y/ O TATA S.A",
            "Tipo Mvto": "A",
            "Mvto UK": "Other",
            "Vlr FV": "10.000.000,00",
            "Fecha FV-Ncr": "15/01/2025"
        },
        # Outside period data
        {
            "Asegurado": "OTRO CLIENTE",
            "Tipo Mvto": "B",
            "Mvto UK": "Other",
            "Vlr FV": "5.000.000,00",
            "Fecha FV-Ncr": "15/06/2025"
        }
    ]
    df = pd.DataFrame(data)
    df.to_excel(filename, index=False, sheet_name="Datos")
    print(f"File {filename} created.")

if __name__ == "__main__":
    create_sample_excel("archivo_entrada.xlsx")
