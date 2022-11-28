import type { LoaderFunction} from '@remix-run/node';
import { json } from '@remix-run/node';
import { db } from '~/db.server';

export const loader: LoaderFunction = async({ request }) => {
    return json(
        await db.product.findMany({
            where: {
                name: {
                    contains: new URL(request.url).searchParams.get('search') ?? ''
                }
            }
        })
    );
}