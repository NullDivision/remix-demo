import type { Product, Shoppable } from '@prisma/client';
import type { ActionFunction, LinksFunction, LoaderFunction, TypedResponse} from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useLoaderData, useLocation } from '@remix-run/react';
import { db } from '~/db.server';
import styles from '~/styles/main.css';
import { differenceInCalendarDays } from 'date-fns/fp';

export const links: LinksFunction = () => [{ href: styles, rel: 'stylesheet' }];

interface ActionResponse {
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

const CartAddKey = 'cart-add';
const DeleteKey = 'delete';
const OpenedKey = 'opened';

const ProductListFormName = 'productListForm';

export const action: ActionFunction = async ({ request }): Promise<TypedResponse<ActionResponse>> => {
  const formData = await request.formData();

  const deleteRowId = formData.get(DeleteKey);
  const openedRowId = formData.get(OpenedKey);
  const cartAddRowId = formData.get(CartAddKey);

  if (typeof deleteRowId === 'string') {
    await db.product.delete({ where: { id: parseInt(deleteRowId, 10) } });
    return redirect('/products');
  }

  if (typeof openedRowId === 'string') {
    await db.product.update({ where: { id: parseInt(openedRowId, 10) }, data: { opened: true } });
    return redirect('/products');
  }

  if (typeof cartAddRowId === 'string') {
    await db.shoppable.create({ data: { productId: parseInt(cartAddRowId, 10) } });
    return redirect('/products');
  }

  return null as never;
};

export const loader: LoaderFunction = async () => {
  return json(await db.product.findMany({ include: { shoppable: true } }));
};

// TODO: add a link to a shopping card
// TODO: be able to set individual items of a product separately (expiration, opened on...)
export default function Index() {
  const products = useLoaderData<Array<Product & { shoppable: Shoppable | null }>>();
  const getDaysRemaining = differenceInCalendarDays(new Date());
  const location = useLocation();

  return (
    <Form method='post' reloadDocument>
      <input type='hidden' name='formName' value={ProductListFormName} />

      <ul id='product-list'>
        {products.map(({ expiryDate, id, name, opened, shoppable }) => (
          <li key={id}>
            <div className='product'>
              <h2 className='product-name'>
                <Link to={`${location.pathname}/${id}`}>{name}</Link>
              </h2>
              [{new Date(expiryDate).toLocaleDateString()}]
              {getDaysRemaining(new Date(expiryDate)) <= 7 && '🕑'}
              <div>
                {!shoppable && (
                  <button name={CartAddKey} type='submit' value={id}>
                    Add to cart
                  </button>
                )}
                {!opened && (
                  <button name={OpenedKey} type='submit' value={id}>
                    Open
                  </button>
                )}
                <button name={DeleteKey} type='submit' value={id.toString()}>
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Form>
  );
}
