import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fa2CodeComponent } from './fa2-code.component';

describe('Fa2CodeComponent', () => {
  let component: Fa2CodeComponent;
  let fixture: ComponentFixture<Fa2CodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fa2CodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fa2CodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
