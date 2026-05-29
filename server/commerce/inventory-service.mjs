export async function checkInventory(client, { sku, quantity }) {
  const result = await client.query('select quantity from app.commerce_inventory where sku = $1', [sku]);
  return Number(result.rows[0]?.quantity || 0) >= Number(quantity || 1);
}

export async function deductInventory(client, { sku, quantity }) {
  const result = await client.query(
    `
      update app.commerce_inventory
      set quantity = quantity - $2, updated_at = now()
      where sku = $1 and quantity >= $2
      returning quantity
    `,
    [sku, quantity],
  );
  if (!result.rowCount) {
    const error = new Error('INSUFFICIENT_INVENTORY');
    error.code = 'INSUFFICIENT_INVENTORY';
    throw error;
  }
  return result.rows[0].quantity;
}
