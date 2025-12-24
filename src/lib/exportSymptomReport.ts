import { MealWithSymptoms, FoodCorrelation } from "@/hooks/useMealSymptomHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function exportToCSV(
  meals: MealWithSymptoms[],
  correlations: FoodCorrelation[]
): void {
  const headers = [
    "Data Refeição",
    "Alimentos",
    "Calorias",
    "Sintomas",
    "Severidade",
    "Data Sintoma",
    "Tempo até sintoma (h)",
    "Observações",
  ];

  const rows = meals.map((meal) => [
    format(new Date(meal.mealDate), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    meal.foods.join(", "),
    meal.totalCalories.toString(),
    meal.symptoms.join(", "),
    meal.severity,
    format(new Date(meal.symptomDate), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    meal.timeDiffHours.toString(),
    meal.notes || "",
  ]);

  // Add correlations section
  rows.push([]);
  rows.push(["--- ALIMENTOS SUSPEITOS ---"]);
  rows.push(["Alimento", "Ocorrências", "Frequência (%)"]);
  
  correlations.slice(0, 10).forEach((c) => {
    rows.push([c.food, c.count.toString(), `${c.percentage}%`]);
  });

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.join(";")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-sintomas-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  meals: MealWithSymptoms[],
  correlations: FoodCorrelation[],
  suspectFoods: FoodCorrelation[],
  days: number
): void {
  const title = `Relatório de Sintomas - Últimos ${days} dias`;
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Build HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; }
        h2 { color: #22c55e; margin-top: 30px; }
        .meta { color: #666; margin-bottom: 20px; }
        .summary { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .summary-item { display: inline-block; margin-right: 30px; }
        .summary-value { font-size: 24px; font-weight: bold; color: #16a34a; }
        .suspect { background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f4f4f5; }
        .severity-leve { color: #ca8a04; }
        .severity-moderado { color: #ea580c; }
        .severity-severo { color: #dc2626; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .badge-suspect { background: #fee2e2; color: #dc2626; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>🍽️ ${title}</h1>
      <p class="meta">Gerado em ${generatedAt}</p>
      
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${meals.length}</div>
          <div>Refeições associadas</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${correlations.length}</div>
          <div>Alimentos identificados</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${suspectFoods.length}</div>
          <div>Alimentos suspeitos</div>
        </div>
      </div>

      ${suspectFoods.length > 0 ? `
        <h2>⚠️ Alimentos Suspeitos</h2>
        <p>Alimentos que aparecem em mais de 30% dos casos de sintomas:</p>
        ${suspectFoods.map(f => `
          <div class="suspect">
            <strong>${f.food}</strong> - ${f.count} ocorrências (${f.percentage}% dos casos)
          </div>
        `).join('')}
      ` : ''}

      <h2>📊 Histórico Detalhado</h2>
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Alimentos</th>
            <th>Sintomas</th>
            <th>Severidade</th>
            <th>Tempo até sintoma</th>
          </tr>
        </thead>
        <tbody>
          ${meals.map(meal => `
            <tr>
              <td>${format(new Date(meal.mealDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
              <td>${meal.foods.map(f => 
                suspectFoods.some(s => s.food === f) 
                  ? `<span class="badge badge-suspect">${f}</span>` 
                  : f
              ).join(", ")}</td>
              <td>${meal.symptoms.join(", ")}</td>
              <td class="severity-${meal.severity}">${meal.severity}</td>
              <td>${meal.timeDiffHours}h</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>📈 Frequência por Alimento</h2>
      <table>
        <thead>
          <tr>
            <th>Alimento</th>
            <th>Ocorrências</th>
            <th>Frequência</th>
          </tr>
        </thead>
        <tbody>
          ${correlations.slice(0, 15).map(c => `
            <tr>
              <td>${c.food} ${c.percentage >= 30 ? '<span class="badge badge-suspect">Suspeito</span>' : ''}</td>
              <td>${c.count}</td>
              <td>${c.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <p style="margin-top: 40px; color: #666; font-size: 11px;">
        Este relatório foi gerado automaticamente. Consulte um profissional de saúde para orientações.
      </p>
    </body>
    </html>
  `;

  // Open print dialog with the HTML
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
