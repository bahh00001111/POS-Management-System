<?php

namespace App\Http\Controllers;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Collection;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Sanitize the per_page query value (bounded so a client cannot request
     * an unbounded page size).
     */
    protected function resolvePerPage(Request $request, int $default = 15, int $max = 100): int
    {
        return max(1, min((int) $request->get('per_page', $default), $max));
    }

    /**
     * Wrap an in-memory collection into a standard LengthAwarePaginator so
     * list endpoints that cache a full collection (e.g. product menu) can
     * paginate without invalidating the single shared cache key.
     */
    protected function paginateCollection(Collection $items, int $perPage, Request $request): LengthAwarePaginator
    {
        $page = max(1, (int) $request->get('page', 1));

        return new LengthAwarePaginator(
            $items->forPage($page, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );
    }

    /**
     * Detect a RESTRICT/NO ACTION foreign-key violation on delete.
     *
     * SQLSTATE 23000 covers every integrity-constraint violation; MySQL's
     * driver error 1451 is the specific "a foreign key constraint fails"
     * case raised when a RESTRICT rule blocks a delete.
     */
    protected function isForeignKeyViolation(QueryException $e): bool
    {
        return (string) $e->getCode() === '23000'
            && (int) ($e->errorInfo[1] ?? 0) === 1451;
    }
}
