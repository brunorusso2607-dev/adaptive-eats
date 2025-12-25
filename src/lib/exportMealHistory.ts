import { MealHistoryItem } from "@/hooks/useMealHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  well: "OK",
  auto_well: "OK",
  symptoms: "Com sintomas",
  pending: "Pendente",
};

export function exportMealHistoryToCSV(
  meals: MealHistoryItem[],
  days: number
): void {
  const headers = [
    "Data",
    "Hora",
    "Refeição",
    "Calorias",
    "Status",
    "Sintomas",
    "Severidade",
    "Tempo até sintoma (h)",
    "Observações",
  ];

  const rows = meals.map((meal) => [
    format(new Date(meal.consumedAt), "dd/MM/yyyy", { locale: ptBR }),
    format(new Date(meal.consumedAt), "HH:mm", { locale: ptBR }),
    meal.recipeName || "Refeição",
    meal.totalCalories.toString(),
    statusLabels[meal.feedbackStatus] || meal.feedbackStatus,
    meal.symptoms.join(", ") || "-",
    meal.severity || "-",
    meal.timeSinceSymptom?.toString() || "-",
    meal.symptomNotes || "",
  ]);

  // Add summary
  const okCount = meals.filter(m => m.feedbackStatus === "well" || m.feedbackStatus === "auto_well").length;
  const symptomsCount = meals.filter(m => m.feedbackStatus === "symptoms").length;
  const pendingCount = meals.filter(m => m.feedbackStatus === "pending").length;

  rows.push([]);
  rows.push(["--- RESUMO ---"]);
  rows.push(["Total de refeições", meals.length.toString()]);
  rows.push(["Refeições OK", okCount.toString()]);
  rows.push(["Com sintomas", symptomsCount.toString()]);
  rows.push(["Pendentes", pendingCount.toString()]);

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.join(";")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historico-refeicoes-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportMealHistoryToPDF(
  meals: MealHistoryItem[],
  days: number
): void {
  const title = days === 0 
    ? "Histórico de Refeições - Hoje" 
    : `Histórico de Refeições - Últimos ${days} dias`;
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const okCount = meals.filter(m => m.feedbackStatus === "well" || m.feedbackStatus === "auto_well").length;
  const symptomsCount = meals.filter(m => m.feedbackStatus === "symptoms").length;
  const pendingCount = meals.filter(m => m.feedbackStatus === "pending").length;
  const successRate = meals.length > 0 ? Math.round((okCount / meals.length) * 100) : 0;

  const getStatusClass = (status: string) => {
    if (status === "well" || status === "auto_well") return "status-ok";
    if (status === "symptoms") return "status-symptoms";
    return "status-pending";
  };

  const getStatusIcon = (status: string) => {
    if (status === "well" || status === "auto_well") return "✓";
    if (status === "symptoms") return "⚠";
    return "○";
  };

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
        .summary { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 20px; flex-wrap: wrap; }
        .summary-item { min-width: 100px; }
        .summary-value { font-size: 24px; font-weight: bold; }
        .summary-value.ok { color: #16a34a; }
        .summary-value.symptoms { color: #f97316; }
        .summary-value.pending { color: #9ca3af; }
        .meal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid; }
        .meal-header { display: flex; justify-content: space-between; align-items: center; }
        .meal-name { font-weight: 600; font-size: 14px; }
        .meal-date { font-size: 12px; color: #666; margin-top: 2px; }
        .meal-calories { font-size: 12px; color: #666; }
        .status-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .status-ok { background: #dcfce7; color: #16a34a; }
        .status-symptoms { background: #ffedd5; color: #ea580c; }
        .status-pending { background: #f3f4f6; color: #6b7280; }
        .symptoms-detail { background: #fff7ed; border-left: 3px solid #f97316; padding: 8px 12px; margin-top: 10px; border-radius: 4px; }
        .symptoms-list { font-size: 12px; color: #c2410c; }
        .severity { font-size: 11px; color: #9a3412; margin-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        @media print { 
          body { padding: 0; } 
          .meal-card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>🍽️ ${title}</h1>
      <p class="meta">Gerado em ${generatedAt}</p>
      
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${meals.length}</div>
          <div>Total</div>
        </div>
        <div class="summary-item">
          <div class="summary-value ok">${okCount}</div>
          <div>Refeições OK</div>
        </div>
        <div class="summary-item">
          <div class="summary-value symptoms">${symptomsCount}</div>
          <div>Com sintomas</div>
        </div>
        <div class="summary-item">
          <div class="summary-value pending">${pendingCount}</div>
          <div>Pendentes</div>
        </div>
        <div class="summary-item">
          <div class="summary-value ok">${successRate}%</div>
          <div>Taxa de sucesso</div>
        </div>
      </div>

      <h2>📋 Histórico Detalhado</h2>
      ${meals.map(meal => `
        <div class="meal-card">
          <div class="meal-header">
            <div>
              <div class="meal-name">${getStatusIcon(meal.feedbackStatus)} ${meal.recipeName || "Refeição"}</div>
              <div class="meal-date">
                ${format(new Date(meal.consumedAt), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                ${meal.totalCalories > 0 ? `• ${meal.totalCalories} kcal` : ''}
              </div>
            </div>
            <span class="status-badge ${getStatusClass(meal.feedbackStatus)}">
              ${statusLabels[meal.feedbackStatus] || meal.feedbackStatus}
            </span>
          </div>
          ${meal.symptoms.length > 0 ? `
            <div class="symptoms-detail">
              <span class="symptoms-list">Sintomas: ${meal.symptoms.join(", ")}</span>
              ${meal.severity ? `<span class="severity">(${meal.severity})</span>` : ''}
              ${meal.timeSinceSymptom ? `<span class="severity">• após ${meal.timeSinceSymptom}h</span>` : ''}
              ${meal.symptomNotes ? `<div style="font-style: italic; margin-top: 5px; font-size: 11px;">"${meal.symptomNotes}"</div>` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}

      <h2>📊 Resumo por Status</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Quantidade</th>
            <th>Porcentagem</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>✓ Refeições OK</td>
            <td>${okCount}</td>
            <td>${meals.length > 0 ? Math.round((okCount / meals.length) * 100) : 0}%</td>
          </tr>
          <tr>
            <td>⚠ Com sintomas</td>
            <td>${symptomsCount}</td>
            <td>${meals.length > 0 ? Math.round((symptomsCount / meals.length) * 100) : 0}%</td>
          </tr>
          <tr>
            <td>○ Pendentes</td>
            <td>${pendingCount}</td>
            <td>${meals.length > 0 ? Math.round((pendingCount / meals.length) * 100) : 0}%</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 40px; color: #666; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        Este relatório foi gerado automaticamente. Consulte um profissional de saúde para orientações sobre sua dieta e intolerâncias alimentares.
      </p>
    </body>
    </html>
  `;

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
