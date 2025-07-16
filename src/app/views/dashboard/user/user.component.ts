import { Component } from '@angular/core';
import { AlignDirective, BorderDirective, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, TableActiveDirective, TableColorDirective, TableDirective } from '@coreui/angular';
import { DocsExampleComponent } from '@docs-components/public-api';

@Component({
  selector: 'app-user',
  imports: [AlignDirective,
  BorderDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  RowComponent,
  TableActiveDirective,
  TableColorDirective,
  TableDirective,DocsExampleComponent],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {

}
