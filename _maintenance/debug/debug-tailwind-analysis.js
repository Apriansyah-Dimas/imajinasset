// Script untuk menganalisis penggunaan Tailwind CSS dalam proyek
const fs = require("fs");
const path = require("path");

// Fungsi untuk menghitung frekuensi penggunaan Tailwind classes
function analyzeTailwindUsage() {
  const srcDir = "./src";
  const tailwindClasses = new Map();
  const componentFiles = [];

  // Recursive function untuk membaca semua file
  function readFilesRecursively(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        readFilesRecursively(filePath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        const content = fs.readFileSync(filePath, "utf8");
        componentFiles.push({ path: filePath, content });

        // Extract className attributes
        const classNameMatches = content.match(
          /className=["'`]([^"'`]+)["'`]/g
        );
        if (classNameMatches) {
          classNameMatches.forEach((match) => {
            const classes = match.match(/className=["'`]([^"'`]+)["'`]/)[1];
            const classList = classes.split(/\s+/);

            classList.forEach((cls) => {
              if (cls && cls.trim()) {
                tailwindClasses.set(cls, (tailwindClasses.get(cls) || 0) + 1);
              }
            });
          });
        }
      }
    }
  }

  readFilesRecursively(srcDir);

  // Sort by frequency
  const sortedClasses = Array.from(tailwindClasses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50); // Top 50 most used

  console.log("=== ANALISIS PENGGUNAAN TAILWIND CSS ===\n");
  console.log(`Total file dianalisis: ${componentFiles.length}`);
  console.log(`Total unique Tailwind classes: ${tailwindClasses.size}`);
  console.log("\n=== 50 TAILWIND CLASS PALING SERING DIGUNAKAN ===\n");

  sortedClasses.forEach(([className, count]) => {
    console.log(`${className}: ${count} kali`);
  });

  // Analisis pola penggunaan
  console.log("\n=== ANALISIS POLA PENGGUNAAN ===\n");

  const complexPatterns = {
    "cn() function calls": 0,
    "Conditional classes": 0,
    "Responsive classes": 0,
    "Dark mode classes": 0,
    "Animation classes": 0,
  };

  componentFiles.forEach(({ content }) => {
    if (content.includes("cn(")) complexPatterns["cn() function calls"]++;
    if (content.includes("?:")) complexPatterns["Conditional classes"]++;
    if (content.match(/(sm|md|lg|xl):/))
      complexPatterns["Responsive classes"]++;
    if (content.includes("dark:")) complexPatterns["Dark mode classes"]++;
    if (content.includes("animate-") || content.includes("transition-"))
      complexPatterns["Animation classes"]++;
  });

  Object.entries(complexPatterns).forEach(([pattern, count]) => {
    console.log(`${pattern}: ${count} file`);
  });

  return {
    totalFiles: componentFiles.length,
    totalClasses: tailwindClasses.size,
    topClasses: sortedClasses,
    patterns: complexPatterns,
  };
}

// Jalankan analisis
const analysis = analyzeTailwindUsage();

// Simpan hasil analisis ke file
fs.writeFileSync(
  "tailwind-analysis-results.json",
  JSON.stringify(analysis, null, 2)
);

console.log("\n=== REKOMENDASI KONVERSI ===\n");
console.log("1. Prioritaskan konversi untuk 50 class paling sering digunakan");
console.log(
  "2. Buat utility classes native CSS untuk menggantikan cn() function"
);
console.log("3. Siapkan media queries untuk responsive design");
console.log("4. Implementasikan dark mode dengan CSS variables");
console.log("5. Konversi animasi ke keyframes CSS native");
