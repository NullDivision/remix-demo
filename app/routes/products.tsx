import type { Product } from '@prisma/client';
import type { LinksFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';
import styles from '~/styles/product.css';

export const links: LinksFunction = () => [{ href: styles, rel: 'stylesheet' }];
export const loader: LoaderFunction = async () => json(await db.product.findMany());

export default function Products() {
  const products = useLoaderData<Array<Product>>();

  return (
    <div id="products-page">
      <ul id='product-list'>
        {products.map((product) => (
          <li key={product.id}>
            <div className='modal'>
              {!!product.externalImage && (
                <div className='product-image'><img alt={product.name} src={product.externalImage} /></div>
              )}
              <a href={`/products/${product.id}`}>{product.name}</a>
            </div>
          </li>
        ))}
      </ul>

      <Outlet />
    </div>
  );
}
