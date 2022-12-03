import type { PantryProduct, Product, Shoppable } from '@prisma/client';
import type { ActionFunction, LinksFunction, LoaderFunction, TypedResponse} from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';
import styles from '~/styles/pantry.css';
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
    await db.pantryProduct.delete({ where: { id: parseInt(deleteRowId, 10) } });
    return redirect('/pantry');
  }

  if (typeof openedRowId === 'string') {
    await db.pantryProduct.update({ where: { id: parseInt(openedRowId, 10) }, data: { opened: true } });
    return redirect('/pantry');
  }

  if (typeof cartAddRowId === 'string') {
    await db.shoppable.create({ data: { productId: parseInt(cartAddRowId, 10) } });
    return redirect('/pantry');
  }

  return null as never;
};

export const loader: LoaderFunction = async () => {
  return json(await db.pantryProduct.findMany({ include: { product: { include: { shoppable: true } } } }));
};

export default function Index() {
  const products = useLoaderData<Array<PantryProduct & { product: Product & { shoppable: Shoppable | null } }>>();
  const getDaysRemaining = differenceInCalendarDays(new Date());

  return (
    <div id='pantry-page'>
      <Form method='post' reloadDocument>
        <input type='hidden' name='formName' value={ProductListFormName} />

        <ul id='product-list'>
          {products.map(({ expiryDate, id, opened, product: { name, shoppable } }) => (
            <li key={id}>
              <div className='product modal'>
                <h2 className='product-name'>
                  <Link to={`/pantry/${id}`}>{name}</Link>
                </h2>
                [{new Date(expiryDate).toLocaleDateString()}]
                {getDaysRemaining(new Date(expiryDate)) <= 7 && '🕑'}
                <div>
                  {!shoppable && (
                    <button name={CartAddKey} type='submit' value={id}>
                      Add to list
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

      <Outlet />
    </div>
  );
}
