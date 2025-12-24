import { MealWithSymptoms, FoodCorrelation, UserProfile, RecipeIngredient } from "@/hooks/useMealSymptomHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function exportToCSV(
  meals: MealWithSymptoms[],
  correlations: FoodCorrelation[]
): void {
  const headers = [
    "Data Refeição",
    "Nome da Receita",
    "Ingredientes",
    "Calorias",
    "Sintomas",
    "Severidade",
    "Data Sintoma",
    "Tempo até sintoma (h)",
    "Observações",
  ];

  const rows = meals.map((meal) => {
    const ingredients = meal.recipeIngredients.length > 0 
      ? meal.recipeIngredients.map(i => `${i.item} (${i.quantity} ${i.unit})`).join(", ")
      : meal.foods.join(", ");
    
    return [
      format(new Date(meal.mealDate), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      meal.recipeName || "Refeição avulsa",
      ingredients,
      meal.totalCalories.toString(),
      meal.symptoms.join(", "),
      meal.severity,
      format(new Date(meal.symptomDate), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      meal.timeDiffHours.toString(),
      meal.notes || "",
    ];
  });

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
  days: number,
  userProfile?: UserProfile
): void {
  const title = days === 0 
    ? "Relatório de Sintomas - Hoje" 
    : `Relatório de Sintomas - Últimos ${days} dias`;
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const intolerancesInfo = userProfile?.intolerances?.length 
    ? `<div class="info-box">
        <strong>⚠️ Suas intolerâncias:</strong> ${userProfile.intolerances.join(", ")}
      </div>`
    : "";

  const formatIngredients = (meal: MealWithSymptoms) => {
    if (meal.recipeIngredients.length > 0) {
      return meal.recipeIngredients.map(i => {
        const isSuspect = suspectFoods.some(s => 
          i.item.toLowerCase().includes(s.food.toLowerCase())
        );
        return isSuspect 
          ? `<span class="badge badge-suspect">${i.item} (${i.quantity} ${i.unit})</span>` 
          : `${i.item} (${i.quantity} ${i.unit})`;
      }).join(", ");
    }
    return meal.foods.map(f => 
      suspectFoods.some(s => s.food === f) 
        ? `<span class="badge badge-suspect">${f}</span>` 
        : f
    ).join(", ");
  };

  // Build HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
        h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; }
        h2 { color: #22c55e; margin-top: 30px; }
        .meta { color: #666; margin-bottom: 20px; }
        .info-box { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin-bottom: 20px; border-radius: 4px; }
        .summary { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 30px; flex-wrap: wrap; }
        .summary-item { }
        .summary-value { font-size: 24px; font-weight: bold; color: #16a34a; }
        .suspect { background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .meal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
        .meal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px; }
        .recipe-name { font-weight: bold; color: #16a34a; font-size: 14px; margin-bottom: 5px; }
        .meal-date { font-size: 12px; color: #666; }
        .ingredients-section { background: #f9fafb; padding: 10px; border-radius: 6px; margin: 10px 0; }
        .ingredients-title { font-size: 11px; color: #666; margin-bottom: 5px; }
        .ingredients-list { font-size: 12px; line-height: 1.6; }
        .symptoms-section { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e5e7eb; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f4f4f5; }
        .severity-leve { background: #fef9c3; color: #a16207; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .severity-moderado { background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .severity-severo { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .badge-suspect { background: #fee2e2; color: #dc2626; }
        .symptom-badge { background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 5px; }
        @media print { 
          body { padding: 0; } 
          .meal-card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>🍽️ ${title}</h1>
      <p class="meta">Gerado em ${generatedAt}</p>
      
      ${intolerancesInfo}
      
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

      <h2>📋 Histórico Detalhado de Refeições</h2>
      ${meals.map(meal => `
        <div class="meal-card">
          <div class="meal-header">
            <div>
              ${meal.recipeName ? `<div class="recipe-name">🍳 ${meal.recipeName}</div>` : ''}
              <div class="meal-date">
                📅 ${format(new Date(meal.mealDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                &nbsp;&nbsp;⏱️ Sintoma após ${meal.timeDiffHours}h
              </div>
            </div>
            <span class="severity-${meal.severity}">${meal.severity}</span>
          </div>
          
          <div class="ingredients-section">
            <div class="ingredients-title">📝 Ingredientes:</div>
            <div class="ingredients-list">${formatIngredients(meal)}</div>
          </div>
          
          ${meal.totalCalories > 0 ? `<div style="font-size: 12px; color: #666;">🔥 ${meal.totalCalories} kcal</div>` : ''}
          
          <div class="symptoms-section">
            <span style="font-size: 11px; color: #666;">Sintomas: </span>
            ${meal.symptoms.map(s => `<span class="symptom-badge">${s}</span>`).join('')}
          </div>
          
          ${meal.notes ? `<div style="font-size: 11px; color: #666; font-style: italic; margin-top: 8px;">"${meal.notes}"</div>` : ''}
        </div>
      `).join('')}

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

      <p style="margin-top: 40px; color: #666; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        Este relatório foi gerado automaticamente. Consulte um profissional de saúde para orientações sobre sua dieta e intolerâncias alimentares.
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
