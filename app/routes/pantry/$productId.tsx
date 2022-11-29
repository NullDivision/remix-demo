import type { PantryProduct, Product } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';

export const loader: LoaderFunction = async ({ params }) => {
    if (!params.productId) {
        throw new Error('No product ID provided');
    }

    return db.pantryProduct.findUnique({ include: { product: true }, where: { id: parseInt(params.productId, 10) } });
};

export default function ProductId() {
    const data = useLoaderData<PantryProduct & { product: Product } | null>();

    if (!data) return null;

    return (
      <div className='modal'>
        <h2>{data.product.name}</h2>
        <dl>
          <dt>Expires on:</dt>
          <dd>{new Date(data.expiryDate).toLocaleDateString()}</dd>

          <dt>Opened:</dt>
            <dd>{data.opened ? 'Yes' : 'No'}</dd>
        </dl>
      </div>
    );
}
