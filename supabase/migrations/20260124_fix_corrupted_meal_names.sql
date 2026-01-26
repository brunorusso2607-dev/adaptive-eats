-- Deletar refeições com caracteres corrompidos no nome
-- Isso inclui refeições com "Pão sem glúten" que foram inseridas com encoding incorreto

DELETE FROM meal_combinations 
WHERE name LIKE '%P_o sem gl_ten%'
   OR name LIKE '%Macarr_o sem gl_ten%'
   OR name LIKE '%Caf_ com leite sem lactose%'
   OR name LIKE '%Requeij_o sem lactose%'
   OR name LIKE '%Aveia sem gl_ten%';
