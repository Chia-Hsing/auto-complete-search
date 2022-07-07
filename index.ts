import * as domUtils from './dom-utils';
import * as dataUtils from './data-utils';
import {
    scan,
    merge,
    fromEvent,
    map,
    switchMap,
    debounceTime,
    distinctUntilChanged,
    filter,
    shareReplay,
    take,
    startWith,
    BehaviorSubject,
    combineLatest,
    catchError,
    share,
    of,
} from 'rxjs';

// 取得輸入框資料流
const keywordInput = document.querySelector('#keyword') as HTMLInputElement;
const keyword$ = fromEvent(keywordInput, 'input').pipe(
    map((e) => (e.target as HTMLInputElement).value),
    startWith(''),
    // 按下搜尋時會轉換成輸入框的資料，但因為沒有下一次的資料輸入，所以不會有動作。
    // 要等待新事件發生，才進行搜尋。這邊重播一次最近的輸入框資料，觸發事件發生。
    shareReplay(1)
);

// 自動搜尋並顯示結果
keyword$
    .pipe(
        debounceTime(700),
        distinctUntilChanged(),
        filter((keyword) => keyword.length > 3),
        switchMap((keyword) => dataUtils.getSuggestions(keyword))
    )
    .subscribe((suggestions) => {
        domUtils.fillAutoSuggestions(suggestions);
    });

const search = document.querySelector('#search') as HTMLButtonElement;

const search$ = fromEvent(search, 'click');

// 每次只取一次的輸入資料，不然 input 的資料流不會終止
const keywordForSearch$ = keyword$.pipe(take(1));

const searchByKeyword$ = search$.pipe(
    switchMap(() => keywordForSearch$),
    // 避免按下搜尋按鈕早於輸入框有資料
    filter((keyword) => !!keyword)
);

searchByKeyword$.pipe(switchMap((keyword) => dataUtils.getSearchResult(keyword))).subscribe((result) => {
    domUtils.fillSearchResult(result);
});

// 實作排序
const sortBy$ = new BehaviorSubject({ sort: 'stars', order: 'desc' });

const changeSort = (sortField: string) => {
    if (sortField === sortBy$.value.sort) {
        sortBy$.next({ sort: sortField, order: sortBy$.value.order === 'desc' ? 'asc' : 'desc' });
    } else {
        sortBy$.next({
            sort: sortField,
            order: 'desc',
        });
    }
};

const stars = document.querySelector('#sort-stars') as HTMLSpanElement;
const forks = document.querySelector('#sort-forks') as HTMLSpanElement;

fromEvent(stars, 'click').subscribe(() => {
    changeSort('stars');
});
fromEvent(forks, 'click').subscribe(() => {
    changeSort('forks');
});

sortBy$.pipe(filter((sort) => sort.sort === 'stars')).subscribe((sort) => {
    domUtils.updateStarsSort(sort);
});

sortBy$.pipe(filter((sort) => sort.sort === 'forks')).subscribe((sort) => {
    domUtils.updateForksSort(sort);
});

const pages = document.querySelector('#per-page') as HTMLSelectElement;
const pre = document.querySelector('#previous-page') as HTMLButtonElement;
const next = document.querySelector('#next-page') as HTMLButtonElement;

const perPage$ = fromEvent(pages, 'change').pipe(
    map((event) => +(event.target as HTMLSelectElement).value),
    startWith(10)
);
const prePage$ = fromEvent(pre, 'click').pipe(map((v) => -1));
const nextPage$ = fromEvent(next, 'click').pipe(map((v) => 1));

const page$ = merge(prePage$, nextPage$).pipe(
    scan((currentPageIndex, value) => {
        const nextPage = currentPageIndex + value;
        return nextPage < 1 ? 1 : nextPage;
    }, 1)
);

page$.subscribe((page) => {
    domUtils.updatePageNumber(page);
});

sortBy$.pipe(filter((sort) => sort.sort === 'stars')).subscribe((sort) => {
    domUtils.updateStarsSort(sort);
});

sortBy$.pipe(filter((sort) => sort.sort === 'forks')).subscribe((sort) => {
    domUtils.updateForksSort(sort);
});

const startSearch$ = combineLatest([searchByKeyword$, sortBy$, page$.pipe(startWith(1)), perPage$.pipe(startWith(10))]);

startSearch$.subscribe(() => {
    domUtils.loading();
});

const getSearchResult = (keyword: string, sort: string, order: string, page: number, perPage: number) =>
    dataUtils.getSearchResult(keyword, sort, order, page, perPage).pipe(
        map((result) => ({ success: true, message: null, data: result })),
        catchError((error) => {
            return of({
                success: false,
                message: error.response.message,
                data: [],
            });
        })
    );

const searchResult$ = startSearch$.pipe(
    switchMap(([keyword, sort, page, perPage]) => getSearchResult(keyword, sort.sort, sort.order, page, perPage)),
    share()
);

searchResult$.subscribe((result) => {
    domUtils.fillSearchResult(result.data);
    domUtils.loaded();
});

searchResult$.pipe(filter((result) => !result.success)).subscribe((result) => {
    alert(result.message);
});
