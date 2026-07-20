import XLSX from "xlsx";
const { readFile, utils } = XLSX;
import * as fs from "fs";
import * as path from "path";

// Define the MaterialItem interface
interface MaterialItem {
  id: string;
  description: string;
  category: 'material' | 'labor' | 'fee';
  unit: string;
  unitPrice: number;
  originalDescription?: string;
}

function run() {
  try {
    const excelPath = path.resolve(process.cwd(), "listamateriales.xlsx");
    if (!fs.existsSync(excelPath)) {
      console.error(`Error: No se encontró el archivo ${excelPath}`);
      process.exit(1);
    }

    const workbook = readFile(excelPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = utils.sheet_to_json<any>(worksheet, { header: 1 });

    if (rows.length < 2) {
      console.error("Error: El archivo Excel debe contener al menos una fila de cabecera y una de datos.");
      process.exit(1);
    }

    // Detect column indexes
    const headers = (rows[0] as any[]).map(h => String(h || "").toLowerCase().trim());
    let descIdx = -1;
    let priceIdx = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes("desc") || h.includes("material") || h.includes("trabajo") || h.includes("concept") || h.includes("item")) {
        descIdx = i;
      }
      if (h.includes("prec") || h.includes("price") || h.includes("unitario") || h.includes("cost") || h.includes("val")) {
        priceIdx = i;
      }
    }

    if (descIdx === -1) descIdx = 0;
    if (priceIdx === -1) priceIdx = headers.length > 1 ? 1 : 0;

    const parsedItems: MaterialItem[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawDesc = String(row[descIdx] || "").trim();
      const rawPriceVal = row[priceIdx];
      
      if (!rawDesc) continue;

      let price = 0;
      if (typeof rawPriceVal === "number") {
        price = rawPriceVal;
      } else if (rawPriceVal) {
        price = parseFloat(String(rawPriceVal).replace(/[^0-9\.]/g, ""));
      }
      if (isNaN(price)) price = 0;

      // Clean description
      const cleanDesc = rawDesc.replace(/^\d+[\.\s\-]+\s*/, "").trim();

      // Determine category
      let category: "material" | "labor" | "fee" = "material";
      const descLower = cleanDesc.toLowerCase();
      
      if (
        descLower.startsWith("remove") || 
        descLower.startsWith("install") || 
        descLower.startsWith("paint") || 
        descLower.startsWith("prime") || 
        descLower.includes("detach") || 
        descLower.startsWith("limpiar") || 
        descLower.startsWith("retirar") ||
        descLower.startsWith("instalar") ||
        descLower.includes("reset")
      ) {
        category = "labor";
      } else if (
        descLower.includes("fee") || 
        descLower.includes("permit") || 
        descLower.includes("tasa") || 
        descLower.includes("permiso")
      ) {
        category = "fee";
      }

      // Determine unit
      let unit = "EA";
      if (
        descLower.includes("shingle") || 
        descLower.includes("felt") || 
        descLower.includes("barrier") || 
        descLower.includes("teja") || 
        descLower.includes("fieltro") || 
        descLower.includes("underlayment")
      ) {
        unit = "SQ";
      } else if (
        descLower.includes("flashing") || 
        descLower.includes("gutter") || 
        descLower.includes("downspout") || 
        descLower.includes("soffit") || 
        descLower.includes("fascia") || 
        descLower.includes("drip") || 
        descLower.includes("starter") || 
        descLower.includes("canaleta") || 
        descLower.includes("borde") ||
        descLower.includes("ridge cap") ||
        descLower.includes("hip / ridge")
      ) {
        unit = "LF";
      }

      parsedItems.push({
        id: `MAT-${(i).toString().padStart(3, '0')}`,
        description: cleanDesc,
        originalDescription: rawDesc,
        category,
        unit,
        unitPrice: price
      });
    }

    const outputDir = path.resolve(process.cwd(), "src", "data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, "materials.json");
    fs.writeFileSync(outputPath, JSON.stringify(parsedItems, null, 2), "utf8");

    console.log(`¡Éxito! Se generó el catálogo en ${outputPath}`);
    console.log(`Total de materiales cargados: ${parsedItems.length}`);
  } catch (err: any) {
    console.error("Error al procesar el catálogo:", err.message);
    process.exit(1);
  }
}

run();
