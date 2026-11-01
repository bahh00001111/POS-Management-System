<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Historical sales data must never be destroyed by a product or category
     * delete. The original migrations created both constraints with
     * ON DELETE CASCADE:
     *
     *   - products.category_id      -> deleting a category deleted its products
     *   - order_details.product_id  -> deleting a product deleted every order line
     *
     * Both are rebuilt as ON DELETE RESTRICT so the database refuses the
     * delete (the controller returns a friendly 409) instead of silently
     * erasing history. Idempotent: the rule is only rewritten when it
     * differs from the target, so fresh installs (whose base migrations are
     * already RESTRICT) and repeated migrates are both safe.
     */
    public function up(): void
    {
        $this->setDeleteRule('products_category_id_foreign', 'RESTRICT');
        $this->setDeleteRule('order_details_product_id_foreign', 'RESTRICT');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setDeleteRule('products_category_id_foreign', 'CASCADE');
        $this->setDeleteRule('order_details_product_id_foreign', 'CASCADE');
    }

    /**
     * Rebuild a known foreign key with the requested ON DELETE rule.
     */
    private function setDeleteRule(string $constraint, string $rule): void
    {
        if ($this->currentDeleteRule($constraint) === $rule) {
            return;
        }

        $statement = match ($constraint) {
            'products_category_id_foreign' => 'ALTER TABLE products '
                . 'ADD CONSTRAINT products_category_id_foreign '
                . 'FOREIGN KEY (category_id) REFERENCES categories (category_id) '
                . "ON DELETE {$rule}",
            'order_details_product_id_foreign' => 'ALTER TABLE order_details '
                . 'ADD CONSTRAINT order_details_product_id_foreign '
                . 'FOREIGN KEY (product_id) REFERENCES products (product_id) '
                . "ON DELETE {$rule}",
            default => throw new InvalidArgumentException("Unknown constraint [{$constraint}]."),
        };

        DB::statement("ALTER TABLE `{$this->tableForConstraint($constraint)}` DROP FOREIGN KEY `{$constraint}`");
        DB::statement($statement);
    }

    /**
     * Read the current ON DELETE rule for a constraint, if it exists.
     */
    private function currentDeleteRule(string $constraint): ?string
    {
        $row = DB::selectOne(
            'SELECT DELETE_RULE AS rule
               FROM information_schema.REFERENTIAL_CONSTRAINTS
              WHERE CONSTRAINT_SCHEMA = DATABASE()
                AND CONSTRAINT_NAME = ?',
            [$constraint]
        );

        return $row?->rule;
    }

    private function tableForConstraint(string $constraint): string
    {
        return match ($constraint) {
            'products_category_id_foreign' => 'products',
            'order_details_product_id_foreign' => 'order_details',
            default => throw new InvalidArgumentException("Unknown constraint [{$constraint}]."),
        };
    }
};