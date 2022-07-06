import * as domUtils from './dom-utils';
import * as dataUtils from './data-utils';
import { fromEvent, map, switchMap, debounceTime, distinctUntilChanged, filter, shareReplay, take, startWith, BehaviorSubject } from 'rxjs';

const keywordInput = document.querySelector('#keyword') as HTMLInputElement;
const keyword$ = fromEvent(keywordInput, 'input').pipe(
    map((e) => (e.target as HTMLInputElement).value),
    startWith(''),
    shareReplay(1)
);

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

const keywordForSearch$ = keyword$.pipe(take(1));

const searchByKeyword$ = search$.pipe(
    switchMap(() => keywordForSearch$),
    filter((keyword) => !!keyword)
);

searchByKeyword$.pipe(switchMap((keyword) => dataUtils.getSearchResult(keyword))).subscribe((result) => {
    domUtils.fillSearchResult(result);
});

const sortBy$ = new BehaviorSubject({ sort: 'stars', order: 'desc' });
console.log('🧬 ~ sortBy$', sortBy$);

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
