import type { Product } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';

export const loader: LoaderFunction = async () => {
    return json((await db.shoppable.findMany({ include: { product: true } })).map((s) => s.product));
};

export default function ShoppingList() {
    const products = useLoaderData<Array<Product>>();

    return <div id="product-list">{products.map((p) => <div key={p.id}>{p.name}</div>)}</div>;
}
