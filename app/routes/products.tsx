import type { Product } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';

export const loader: LoaderFunction = async () => json(await db.product.findMany());

export default function Products() {
    const products = useLoaderData<Array<Product>>();

    return <ul>{products.map((product) => <li key={product.id}>{product.name}</li>)}</ul>;
}
