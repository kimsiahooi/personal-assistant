<?php

declare(strict_types=1);

use App\Http\Controllers\AccountController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

/*
| The finance module. Declared explicitly rather than with Route::resource, so the
| routes that exist are the routes that are read — there are no create/edit/show pages
| here: every module is a list with a form in a sheet over it.
|
| Names are bare (`accounts.index`), which is what Wayfinder emits into
| `@/routes/accounts`.
*/

Route::middleware(['auth'])->group(function (): void {
    Route::prefix('accounts')->name('accounts.')->group(function (): void {
        Route::get('/', [AccountController::class, 'index'])->name('index');
        Route::post('/', [AccountController::class, 'store'])->name('store');
        Route::patch('{account}', [AccountController::class, 'update'])->name('update');
        Route::delete('{account}', [AccountController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('categories')->name('categories.')->group(function (): void {
        Route::get('/', [CategoryController::class, 'index'])->name('index');
        Route::post('/', [CategoryController::class, 'store'])->name('store');
        Route::patch('{category}', [CategoryController::class, 'update'])->name('update');
        Route::delete('{category}', [CategoryController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('transactions')->name('transactions.')->group(function (): void {
        Route::get('/', [TransactionController::class, 'index'])->name('index');
        Route::post('/', [TransactionController::class, 'store'])->name('store');
        Route::patch('{transaction}', [TransactionController::class, 'update'])->name('update');
        Route::delete('{transaction}', [TransactionController::class, 'destroy'])->name('destroy');
    });
});
