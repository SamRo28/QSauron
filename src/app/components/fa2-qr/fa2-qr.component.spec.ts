import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fa2QrComponent } from './fa2-qr.component';

describe('Fa2QrComponent', () => {
  let component: Fa2QrComponent;
  let fixture: ComponentFixture<Fa2QrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fa2QrComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fa2QrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
