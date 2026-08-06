type EstateSaleDeletionClient = {
  basecampCardLink: {
    updateMany(args: {
      where: { estateSaleId: number };
      data: { estateSaleId: null };
    }): Promise<unknown>;
  };
  soldItem: {
    deleteMany(args: { where: { estateSaleId: number } }): Promise<unknown>;
  };
  estateSale: {
    delete(args: { where: { id: number } }): Promise<unknown>;
  };
};

/**
 * Remove records owned by a sale while retaining Basecamp job history.
 * This must run inside a database transaction so a partial deletion cannot
 * leave the sale in an inconsistent state.
 */
export async function deleteEstateSaleRecords(
  client: EstateSaleDeletionClient,
  saleId: number
) {
  await client.basecampCardLink.updateMany({
    where: { estateSaleId: saleId },
    data: { estateSaleId: null }
  });
  await client.soldItem.deleteMany({ where: { estateSaleId: saleId } });
  await client.estateSale.delete({ where: { id: saleId } });
}
